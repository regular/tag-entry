var pull = require('pull-stream');
var pushable = require('pull-pushable');
var events = require('fdom/next');
var element = require('element');
var debounce = require('pull-debounce');

var insertcss = require('insert-css');
var fs = require('fs');

insertcss(fs.readFileSync('./styles.css'));

function append(el, content) {
    if (typeof content === 'string') {
        content = element(content);
    }
    el.appendChild(content);
    return content;
}

module.exports = function(el, id, tagStream, createSuggestionStream, opts) {
    opts = opts || {};
    var updateStream = pushable();
    var tags = {};
    var container = document.createElement('div');
    el.appendChild(container);
    container.classList.add('tag-entry');
    var ul = document.createElement('ul');
    container.appendChild(ul);

    var makeTagElement = opts.makeTagElement || function(tagName, forSuggestionBox) {
        var el = document.createElement("span");
        el.innerHTML = tagName + '<button class="remove-tag"></button></span>';
        console.log(el);
        return el;
    };

    var makeInputElement = opts.makeInputElement || function() {
        return '<input type="text">';
    };

    var input = append(container, makeInputElement());

    // TODO: if the content of our input field changes
    // we need to generate suggestions
    pull(
        pull.Source(events('input', input)),
        pull.through(function(x){console.log(x);}),
        debounce(250),
        pull.map(function(ev) {
            console.log('map');
            return ev.target.value;
        }),
        pull.log()
    );

    // if the user hists enter, we add a tag
    pull(
        pull.Source(events('keyup', input)),
        pull.filter(function(ev) {return ev.keyCode == 13;}),
        pull.filter(function(ev) {return ev.target.value !== '';}),
        pull.drain(function(ev) {
            console.log(updateStream);
            updateStream.addTag(ev.target.value);
        })
    );
    // TODO: if the content of our input field changes
    // we need to generate suggestions
    pull(
        pull.Source(events('input', input)),
        pull.through(function(x){console.log(x);}),
        debounce(250),
        pull.map(function(ev) {
            console.log('map');
            return ev.target.value;
        }),
        pull.log()
    );
    
    pull(
        tagStream,
        pull.filter(function(o) {
            o.type = o.type || 'put';
            if (o.type === 'put')
                return typeof tags[o.key] === 'undefined';
            return true;
        }),
        pull.through(function(o) {
            if (o.type === 'put') {
                tags[o.key] = o.value;
                var li = document.createElement('li');
                li.setAttribute("name", o.key); 
                li.appendChild(makeTagElement(o.value));
                var button = li.getElementsByClassName('remove-tag')[0];
                if (button) {
                    button.addEventListener('click', function() {
                       updateStream.removeTag(o.value);
                    });
                }
                append(ul, li);
            } else { // type is delete, it seems.
                var item = el.querySelector('li[name=' + o.key + ']');
                console.log('item', item);
                ul.removeChild(item);
                delete tags[o.key];
            }
        }),
        pull.drain()
    );

    function sanitize(name) {
        var result = 'hex' + (new Buffer(name)).toString('hex');
        console.log('name', name, 'sanitized', result);
        return result;
    }

    updateStream.addTag = function(tagName) {
        updateStream.push({
            type: 'put',
            key: sanitize(tagName),
            value: tagName
        });
    };

    updateStream.removeTag = function(tagName) {
        updateStream.push({
            type: 'del',
            key: sanitize(tagName)
        });
    };

    return updateStream;
};

