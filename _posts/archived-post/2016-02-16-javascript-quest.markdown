---
layout: post
title: "Here be Properties!"
date: 2016-02-16
categories: blog javascript
visible: 0
---
Last article we briefly went over JavaScript objects and different ways to initialize objects. In this article, we are going to touch on Object properties and the variety of ways to access them. Properties can be defined as variables that are attached to objects. Object properties can be assigned any type of value in JavaScript.

### Dot Notation ###
The dot notation is probably the most commonly used way of accessing object properties. Below is an example of how to access an object's properties using the dot notation:
{% highlight javascript %}
var person = {
  name: ''  
};

person.name = 'Chuck';

console.log(person.name);
{% endhighlight %}


### Bracket Notation ###
The bracket notation is another way of being able to access object properties. Below is an example of how to access an object's properties using the bracket notation:
{% highlight javascript %}
var person = {
  Name: ''  
};

person['Name'] = 'Chuck';

console.log(person.Name);
{% endhighlight %}


### Property Names ###
Property names must be a string and non-string objects cannot be used as a key in the object. Any non-string that is passed in will be casted into a string.
{% highlight javascript %}
var person = { };

person['1'] = 'Chuck';

console.log(person[1]);
{% endhighlight %}


### Use Case ###
Accessing properties using a numerical value that will be type casted in to a string may not seem useful at first; however, if a dictionary is being created from some other source having properties dedicated to key value pairs could potentially eliminate the need for any looping to occur.
{% highlight javascript %}
var personDictionary = {  };

personDictionary['1'] = {
    FirstName: 'Chuck',
    LastName: 'Norris'
};

console.log(personDictionary[1]);
{% endhighlight %}

### Thanks ###
I wanted to say thanks to Phil DeVeau for sending me message regarding property accessors. If you feel that anything is missing or wrong, please feel free to contact me.


References:

[MDN Property Accessors][MDN - Property Accessors]

[MDN Define Properties][MDN - Define Property]

[MDN Working with Objects][MDN - Working With Objects]

[MDN - Property Accessors]:         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_Accessors
[MDN - Define Property]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[MDN - Working With Objects]:       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects
