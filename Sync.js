module('users.robertkrahn.Sync').requires('lively.TestFramework').toRun(function() {

Object.subclass('lively.Sync.ObjectHandle',
"initializing", {
    initialize: function(options) {
        this.basePath = options.basePath || '';
        this.store = options.store;
        this.registry = {};
        this.localStore = {};
    }
},
'read', {
    get: function(path, callback) {
        this.subscribe(path, callback, true);
    },
    
    subscribe: function(path, callback, once) {
        var store = this.store, registry = this.registry;
        var i = 0;
        function updateHandler(path, val) {
            if (i++ > 100) { debugger; throw new Error('Endless recursion in #subscribe'); }
            if (!registry[path] || !registry[path].include(updateHandler)) return;
            callback(val);
            if (!once) store.addCallback(path, updateHandler);
        }
        if (!registry[path]) { registry[path] = []; }; registry[path].push(updateHandler);
        store.get(path, updateHandler) || store.addCallback(path, updateHandler);
    },
    
    off: function(path) {
        delete this.registry[path];
    }
},
'write', {
    set: function(path, val, callback) {
        this.store.set(path, val, {callback: callback});
    },
    
    commit: function(path, updateFunc, callback) {
        var handle = this;
        this.get(path, function(val) {
            var newVal = updateFunc(val);
            // cancel commit?
            if (newVal === undefined) {
                callback(null, false, val);
                return;
            }
            handle.store.set(path, newVal, {
                callback: function(err) {
                    if (err && err.type === 'precondition') {
                        handle.commit(path, updateFunc, callback);
                        return;
                    }
                    callback(err, !err, err ? val : newVal);
                },
                precondition: function() {
                    var storeVal = handle.store[path];
                    return storeVal === val;
                }
            });
        });
    }
},
'server communication', {},
'updating', {},
'debugging', {
    toString: function() {
        return 'ObjectHandle(' + Objects.inspect({name: this.basePath})
             + ', ' + Objects.inspect(this.localStore) + ')';
    }
});

Object.subclass('lively.Sync.LocalStore',
'properties', {
    callbacks: {}
},
'accessing', {

    set: function(path, val, options) {
        options = options || {}, preconditionOK = true;
        if (options.precondition) {
            var preconditionOK = options.precondition();
            if (!preconditionOK) {
                options.callback && options.callback({type: 'precondition'});
                return;
            }
        }
        this[path] = val;
        var cbs = this.callbacks[path] || [];
        this.callbacks[path] = [];
        while (cbs && (cb = cbs.shift())) cb(path, val);
        options.callback && options.callback(null);
    },
    
    get: function(path, callback) {
        var hasIt = this.has(path);
        if (hasIt) callback(path, this[path]);
        return hasIt;
    },

    addCallback: function(path, callback) {
        var cbs = this.callbacks[path] = this.callbacks[path] || [];
        cbs.push(callback);
    }
},
'testing', {

    has: function(path) {
        return !!this.hasOwnProperty(path);
    }

});

TestCase.subclass('lively.Sync.test.ObjectHandleInterface',
'running', {
    setUp: function($super) {
        $super(); 
        this.store = new lively.Sync.LocalStore();
        this.rootHandle = new lively.Sync.ObjectHandle({store: this.store});
    }
},
'testing', {
    
    testGetValue: function() {
        this.store.set('foo', 23);
        var result = [];
        this.rootHandle.get('foo', function(val) { result.push(val); });
        this.assertEqualState([23], result);
    },
    
    
    testGetWhenAvailable: function() {
        var result = [];
        this.rootHandle.get('foo', function(val) { result.push(val); });
        this.assertEqualState([], result);
        this.store.set('foo', 23);
        this.assertEqualState([23], result);
    },

    testetTwice: function() {
        var result1 = [], result2 = [];
        this.rootHandle.get('foo', function(val) { result1.push(val); });
        this.rootHandle.get('foo', function(val) { result2.push(val); });
        this.store.set('foo', 23);
        this.assertEqualState([23], result1);
        this.assertEqualState([23], result2);
        this.store.set('foo', 24);
        this.assertEqualState([23], result1);
        this.assertEqualState([23], result2);
    },
    
    testOn: function() {
        var result = [];
        this.store.set('foo', 23);
        this.rootHandle.subscribe('foo', function(val) { result.push(val); });
        this.assertEqualState([23], result);
        this.store.set('foo', 42);
        this.assertEqualState([23, 42], result);
    },
    
    testOnOff: function() {
        var result = [];
        this.store.set('foo', 23);
        this.rootHandle.subscribe('foo', function(val) { result.push(val); });
        this.assertEqualState([23], result);
        this.rootHandle.off('foo');
        this.store.set('foo', 42);
        this.assertEqualState([23], result);
    },
    
    testSet: function() {
        var done;
        this.rootHandle.set('foo', 23, function(err) { done = true });
        this.assert(done, 'not done?');
        this.assertEqualState(23, this.store.foo);
    },
    
    testCommit: function() {
        var done, writtenVal, preVal;
        this.store.foo = 22;
        this.rootHandle.commit(
            'foo',
            function(oldVal) { preVal = oldVal; return oldVal + 1; },
            function(err, committed, val) { done = committed; writtenVal = val; });
        this.assertEquals(22, preVal, 'val before set');
        this.assert(done, 'not committed?');
        this.assertEquals(23, this.store.foo);
        this.assertEquals(23, writtenVal);
    },
    
    testCommitCancels: function() {
        var done, written, eventualVal;
        this.store.foo = 22;
        this.rootHandle.commit(
            'foo',
            function(oldVal) { return undefined; },
            function(err, committed, val) { done = true; written = committed; eventualVal = val; });
        this.assert(done, 'not done?');
        this.assert(!written, 'committed?');
        this.assertEquals(22, this.store.foo);
        this.assertEquals(22, eventualVal);
    },
    
    testCommitWithConflict: function() {
        var done, written, eventualVal;
        var store = this.store;
        store.set('foo', 22);
        this.rootHandle.commit(
            'foo',
            function(oldVal) { if (oldVal === 22) store.set('foo', 41); return oldVal + 1; },
            function(err, committed, val) { done = true; written = committed; eventualVal = val; });
        this.assert(done, 'not done?');
        this.assert(written, 'not committed?');
        this.assertEquals(42, this.store.foo);
        this.assertEquals(42, eventualVal);
    },
    
    testChildAccess: function() {}

});

}) // end of module