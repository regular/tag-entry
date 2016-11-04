var level = require('level-mem');
var pull = require('pull-stream');
var pl = require('pull-level');
var test = require('tape');
var entry = require('.');

function createTag(name) {
    var li = document.createElement('li');
    li.innerHTML = name + '<button class="removeTag">x</button>';
    return li;
}

test('should call makeTagElement() for each tag', function(t) {
    t.plan(3);
    var tags = [
        {key: "hex61", value: 'a'},
        {key: "hex62", value: 'b'},
        {key: "hex63", value: 'c'}
    ];
    var i = 0;
    var e = entry(document.body, 'myObj', pull.values(tags), null, {
        makeTagElement: function (name) {
            t.equal(name, tags[i++].value);
            return createTag(name);
        }
    });
});

test('addTag() should call makeTagElement() and create a put', function(t) {
    t.plan(5);
    var db = level('test');
    var tags = [
        {key: "hex61", value: 'a', type: 'put'},
        {key: "hex62", value: 'b', type: "put"},
        {key: "hex63", value: 'c', type: "put"}
    ];
    var i = 0;
    pull(pull.values(tags), pl.write(db, {windowSize: 1}));
    var e = entry(document.body, 'myObj', pl.read(db, {tail: true}), null, {
        makeTagElement: function (name) {
            if (i===3) t.equal(name, 'd');
            else t.equal(name, tags[i++].value);
            return createTag('~~' + name);
        }
    });
    e.addTag('d');
    pull(
        e,
        pull.through(function(o) {
            t.deepEqual(o, {
                type: 'put',
                key: 'hex64',
                value: 'd'
            });
        }),
        pl.write(db, {windowSize: 1})
    );
});

test('removeTag() should create a del and remove the li', function(t) {
    t.plan(2);
    document.body.innerHTML = '';
    var db = level('test');
    var tags = [
        {key: "hex61", value: 'a', type: 'put'},
        {key: "hex62", value: 'b', type: "put"},
        {key: "hex63", value: 'c', type: "put"}
    ];
    var i = 0;
    pull(pull.values(tags), pl.write(db, {windowSize: 1}));
    var e = entry(document.body, 'myObj', pl.read(db, {tail: true}));
    e.removeTag('a');
    pull(
        e,
        pull.through(function(o) {
            t.deepEqual(o, {
                type: 'del',
                key: 'hex61'
            });
        }),
        pl.write(db, {windowSize: 1})
    );
    setTimeout(function() {
        var elements = document.body.querySelectorAll('li');
        t.equal(elements.length, 2);
    }, 100);
});
