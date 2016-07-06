---
layout: post
title: "This cake is a lie!"
date: 2016-07-06
categories: blog javascript
visible: 1
---
If you have ever worked with any type of object-oriented language, the odds are that you have encountered the ["this"][MDN - JavaScript This] keyword. In this article we will be discussing how the "this" key word operates in the context of JavaScript and briefly touching on other related topics that relate as well.

### Strictly Speaking Strict ###
[Strict mode][MDN - Strict Mode] is a restricted variant of JavaScript. It helps eliminate some of JavaScript silent errors, fixes potential performance issues related to JavaScript engine perform optimizations, and prohibits syntax that will likely be defined in future versions of ECMAScript. Using strict mode basically boils doing to making "secure" JavaScript easier to write. Below is an example of how to invoke strict mode and what error it should throw.

{% highlight javascript %}
'using strict';

var mistypedVariable = 1;

// Should throw a ReferenceError due to the misspelling of variable
mistypedVaraible = 17;
{% endhighlight %}

### What is "this"? ###
The "this" keyword value is determined by how a function is called. When using "this" outside of a function, it refers to the global object. Below is an example of using "this" in a global context:

{% highlight javascript %}
var globalObject = this;

// Logs true
console.log(globalObject === this);

// Logs True
console.log(globalObject.document === document);

// Logs True
console.log(this.document === document);

// Assign a variable on the Global Object
this.anotherVariable = 1;

// Logs 1
console.log(this.window.anotherVariable);

// Logs 1
console.log(globalObject.anotherVariable);
{% endhighlight %}

In function context the value depends on how the function is called; additionally, it does have differences between strict mode and non-strict mode. In the first case the value of "this" is not set by the call, because in non-strict mode "this" must always be a object. In the second case, the of "this" remains at whatever it is set to when entering the execution context.

{% highlight javascript %}
function exampleOne() {
    return this;
}

// Returns true
console.log(exampleOne() === window);

function exampleTwo() {
    'use strict';
    return this;
}

// Returns true
console.log(exampleTwo() === undefined);
{% endhighlight %}


### "This" Object Method ###
When invoking the "this" context within an object's method, the context it is set to is calling object. The example below uses both an inline function and a declared method that is separately attached to the object.

{% highlight javascript %}
var item = {
    value: 100,
    action: function() {
        console.log(this.value);

        return this.value;
    }
};

function testFunction(){
    var itemTest = this;

    console.log(itemTest.value);

    return itemTest.value;
}

item.callMe = testFunction;

// Logs and returns 100
item.action();

// Logs and returns 100
item.callMe();
{% endhighlight %}


### "This" Object Constructors ###
If you are not familiar with Object Constructors or need a quick refresher, head over [here][nkane - JavaScript Object].

{% highlight javascript %}
function PersonConstructor(name, age) {
    var person = this;
    person.name = name;
    person.age = age;
}

function ItemConstructor(type) {
    var item = this;
    item.type = type;

    return {
        type: 'Item Is Gone!'
    };
}

var chuck = new PersonConstructor('Chuck', 100);

// Logs 'Chuck'
console.log(chuck.name);

// Logs 100
console.log(chuck.age);

chuck = new ItemConstructor('nun-chucks!:D');

// Logs - 'Item Is Gone!'
console.log(chuck.type);
{% endhighlight %}

### Closures ###
[Closures][MDN - Closures] in JavaScript is another "rabbit hole" that we will drive in to deeper in another article. Briefly, closures in JavaScript are the relation that variables have to to enclosing function(s). Below is a simple example of how closures work in JavaScript:

{% highlight javascript %}
function outterScope() {
    var name = "Joe";

    function innerScope() {
        console.log('Hello my name is ' + name);
    }
    innerScope();
}

// The innerScope function has access to outterScope function variables.
outterScope();
{% endhighlight %}

If you have any questions, comments, request, or concerns, please feel free to contact me.

[MDN - Closures]:               https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
[MDN - Functions]:              https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions
[MDN - JavaScript This]:        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
[MDN - Strict Mode]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
[nkane - JavaScript Object]:    http://nkane.github.io/blog/javascript/2016/01/15/javascript-quest.html
