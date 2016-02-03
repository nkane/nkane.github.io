---
layout: post
title: "Here be Properties!"
date: 2016-02-01
categories: blog javascript
visible: 0
---
Last article we briefly went over JavaScript objects and different ways to initialize objects. In this article, we are going to touch on Object properties and the variety of ways to access them. Properties can be defined as variables that are attached to objects. Object properties can be assigned any type of value in JavaScript.

###Object Property Dot Notation
The dot notation is probably the most commonly used way of accessing object properties. Below is a example of how to access an object's properties using the dot notation:
{% highlight javascript %}
var person = {
  name: ''  
};

person.name = 'Chuck';

console.log(person.name);
{% endhighlight %}



[MDN - Property Accessors]:         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_Accessors  
[MDN - Define Property]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[MDN - Working With Objects]:       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects
