---
layout: post
title: "Why, Hello there Mr. Object?"
date: 2016-01-06
categories: blog javascript
visible: 0
---
After doing a bit of research on some of the details regarding JavaScript objects, I figured I would write a post about it. JavaScript has a ["new operator"][MDN - Object]. The operator of this key word is to create an instance of a user-defined object type or one of the built-in object types that has a constructor function (more on that in a second).

####Object Literal
{% highlight javascript %}
var person = {
    firstName: 'Timmeh',
    lastName: 'Brass'
};

console.log(person);

// Output: Object {firstName: "Greg", lastName: "McGregor"}
{% endhighlight %}


####Constructor Function
{% highlight javascript %}
function PersonConstructor(first, last) {
    this.firstName = first;
    this.lastName = last;
}

var anotherPerson = new PersonConstructor('Jerreh', 'Mass');

console.log(anotherPerson);

// Output: PersonConstructor {firstName: "Greg", lastName: "Gregory"}
{% endhighlight %}

[yuiblog]:              http://yuiblog.com/blog/2006/11/13/javascript-we-hardly-new-ya/
[MDN - New Operator]:   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new
[MDN - Object]:         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
