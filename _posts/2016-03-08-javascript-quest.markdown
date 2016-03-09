---
layout: post
title: "This cake is a lie!"
date: 2016-03-08
categories: blog javascript
visible: 0
---
If you have ever worked any type of object-oriented language, the odds are that you have encountered the ["this"][MDN - JavaScript This] keyword. In this article we will be discussing how the "this" key word operates in the context of JavaScript and touching on some other topics that relate as well.

### Strictly Speaking Strict ###
[Strict mode][MDN - Strict Mode] is a restricted variant of JavaScript. It helps eliminate some of JavaScript silent errors, fixes potential performance issues related to JavaScript engine perform optimizations, and prohibits syntax that will likely be defined in future versions of ECMAScript.

{% highlight javascript %}
'using strict';

var mistypedVariable = 1;

// Should throw a ReferenceError do to the misspelling of variable
mistypedVaraible = 17;
{% endhighlight %}

### What is "this"? ###
The keyword "this" in JavaScript does have differences between strict mode and non-strict mode.

{% highlight javascript %}

{% endhighlight %}



[MDN - Closures]:               https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
[MDN - JavaScript This]:        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
[MDN - Strict Mode]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
