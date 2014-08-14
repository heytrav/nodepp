
var events = require('events');
var util  = require('util');

EventDispatcher = function (){
    events.EventEmitter.call(this);
    this.childFree = function (registry) {
        this.emit('childFree', registry);
    };
    this.queueChild = function (registry) {
        this.emit('queueChild', registry);
    };

};
util.inherits(EventDispatcher, events.EventEmitter);


module.exports = EventDispatcher;
