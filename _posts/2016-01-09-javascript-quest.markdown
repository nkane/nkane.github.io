---
layout: post
title: "Why, Hello there Mr. Object?"
date: 2016-01-06
categories: blog javascript
visible: 0
---
After doing a bit of research on some of the details regarding JavaScript objects, I figured I would write a post about it. JavaScript has a ["new operator"][MDN - Object], and the functionality of this operation is the create an instance of a user-defined object type or one of the built-in object types that has a constructor function (more on that shortly).

###Object Literal or Initializer Notation
Object literals allow for quick creation of objects with declared properties inside. When creating an Object this way, it does not create an Object wrapper around it. Instead, it just creates a small Object without any unnecessary functionality behind it. We will discuss what exactly Object wrappers. Below is an example of how to declare an Object Literal:

{% highlight javascript %}
var person = {
    firstName: 'Timmeh',
    lastName: 'Brass'
};

console.log(person);

/*
  Output:
    Object {
      firstName: "Greg",
      lastName: "McGregor"
    }
*/
{% endhighlight %}


###Constructor Function
Constructor Functions
{% highlight javascript %}
function PersonConstructor(first, last) {
    this.firstName = first;
    this.lastName = last;
}

var anotherPerson = new PersonConstructor('Jerreh', 'Mass');

console.log(anotherPerson);

/*
  Output:
    PersonConstructor {
      firstName: "Greg",
      lastName: "Gregory"
    }
*/
{% endhighlight %}


###Object Wrappers
{% highlight javascript %}

{% endhighlight %}


[Interview]:            http://www.programmerinterview.com/index.php/javascript/wrapper-objects-in-javascript/
[MDN - New Operator]:   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new
[MDN - Object]:         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[yuiblog]:              http://yuiblog.com/blog/2006/11/13/javascript-we-hardly-new-ya/
