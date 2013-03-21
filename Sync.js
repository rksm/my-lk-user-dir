module('users.robertkrahn.Sync').requires('lively.TestFramework').toRun(function() {

module('lively.sync');

Object.subclass('lively.sync.Model',
"initializing", {
    initialize: function(options) {
        this.name = options.name || 'unnamed model';
        this.store = options.store;
        this.localStore = {};
    }
},
'acessing', {
    set: function(key, val, options) {
        options = options || {};
        var storedVal = {value: val};
        this.localStore[key] = storedVal;
        this.send(key, storedVal, options);
        return val;
    },

    get: function(key) {
        return this.localStore[key] && this.localStore[key].value;
    }
},
'server communication', {
    req: function(path) {
        return URL.root.withFilename("nodejs/SimpleSync/" + this.name + '/' + (path || '')).asWebResource();
    },
    sendx: function(key, obj) {
        var payload = JSON.stringify({value: obj, id: this.owner, expectedId: this.owner}),
            req = this.req(key);
        connect(req, 'status', this, "handleConflict", {updater: function($upd, stat) {
            if (stat && stat.isDone() && stat.code() == 412) $upd(JSON.parse(this.sourceObj.xhr.responseText));
        }});
        return req.put(payload, 'application/json');
    },
    handleConflictx: function(serverResponse) {
        lively.bindings.signal(this, 'conflict', {
            event: 'conflict',
            model: this.name,
            key: serverResponse.key,
            remote: serverResponse.value.value,
            local: this.get(serverResponse.key)
        });
    },
    send: function(key, storageValue, options) {
        this.store && this.store.save(key, storageValue, options.precondition, function(err, my, other) {

        });
    }
},
'updating', {
    subscribeTo: function(key) {
        this.store.addDependant(this, key);
    },
    onChange: function(key, value) {
        this.localStore[key] = value;
    }
},
'debugging', {
    toString: function() {
        return 'Model(' + Objects.inspect({name: this.name, owner: this.owner})
             + ', ' + Objects.inspect(this.localStore) + ')';
    }
});

TestCase.subclass('lively.sync.test.Model',
'running', {
    setUp: function($super) {
        $super();
        this.store = {
            save: function(key, val, precondition) {
                if (precondition && !precondition(val, this[key])) return;
                this[key] = val;
                var deps = this.dependants || {};
                Object.keys(deps).forEach(function(key) {
                    deps[key].onChange(key, val);
               });
            },
            addDependant: function(model, key) {
                this.dependants = this.dependants || {};
                this.dependants[key] = model;
            }
        }
        this.model = new lively.sync.Model({
            name: this.currentSelector,
            store: this.store
        });
        this.model2 = new lively.sync.Model({
            name: this.currentSelector + '2',
            store: this.store
        });
    }
},
'testing', {
    testGetAndSetWithStore: function() {
        var state = {bar: 23};
        this.model.set("foo", state);
        this.assertEqualState(state, this.model.get('foo'), 'model');
        this.assertEqualState(state, this.store.foo.value, 'server');
    },

    testChangeGetsPropagated: function() {
        var state = {bar: 23};
        this.model2.subscribeTo('foo');
        this.model.set("foo", state);
        this.assertEqualState(state, this.model2.get('foo'), 'model2 ' + Objects.inspect(this.model2.get('foo')));
    },

    testSaveWithPrecondition: function() {
        this.store.foo = {value: 3};
        this.model.set("foo", 4, {precondition: function(my, other) { return other.value === 3; }});
        this.assertEquals(4, this.store.foo.value);
        this.model.set("foo", 5, {precondition: function(my, other) { return other.value === 3; }});
        this.assertEquals(4, this.store.foo.value);
    }
});
}) // end of module