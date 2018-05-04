---
layout: post
Title: "Postmortem Ludum Dare Game Jam"
date: 2018-03-15
categories: blog gamedev gaming
visible: 0
---
If the reader is not aware of what a game jam is, it is a time constraint event that typically provides a theme for game
developers to create a game within the allotted time.

A about a month ago, I was told about a game jam event called ["Ludum Dare"][ld-jam] by a co-worker. In the past, I had been
interested in participating in a game jam; however, I had never fully committed to the idea of participating in one of these
events. When I found out that Ludum Dare is one of the largest and longest running game jams, I did not want to make any excuse
for not participating in a game jam event in 2017. 

Participants of Ludum Dare are giving two different categories, the "Jam" or the "Compo". The main differnece between the two
is time allotted and the ability to work with or without a team. The "Jam" has an allotted time of 72 hours, and allows teams
and solo projects. The "Compo" has an alotted time of 48 hours, and only allows solo projects and all assets are made by the
participant as well. 

For this jam, we decided to team up with another co-work and an artist for a total of 4 team members. We all worked together on 
a daily basis at a web development shop, and we all enjoy the process of developing video games. We definitely had a significant
of lack of preparation leading up to the jam, but all in all it was a expectional learning experience for myself.


### Choosing a Toolset to Work With
In the world of development and especially web development, there always seems to be an overwhelming amount of opinions or
biases towards particular languages or toolsets. Personally, I do not favor web development languages or toolsets. It took a
little bit of myself convincing my fellow teammates to use the language C paired with a library that none of us were familiar
with called [raylib][raylib-web]. It took me about two evening to setup a [starter-kit][raylib-starter-kit] with the library.
One of the major selling points of library it came with examples of how to setup a project to compile with
[emscripten][emscripten-compiler]. That allowed us to provide a binary build and an html5 build that was capable of being
deployed on [itch.io][depth-crawler-web].


### Let the Game Begin!
For this particular event, Ludum Dare, they do not release the theme information until 9:00 PM on the first day. The theme
for Ludum Dare 40 was "the more you have, the worst it is". On the first evening, we needed to figure out what we wanted to
create. Originally, we had the idea of creating a 2D tile based dungeon crawl drawing inspiration from games like the
[Binding of Issac][binding-of-isaac]. We started to create a basic layout for a tile-map that by just drawing some rectangles
on the screen to see it would work out.

![original-tiles-picture-0][original-tiles-0]
![original-tiles-picture-1][original-tiles-1]

Next we standardized a basic tile map size and had it render out basic static rooms with corridors between the room. We then
added another player rectangle that would be controlled by they player's input with no physics calculations. After we got that
working we started to work on rectangluar collision for "walls".

![title-map-collision-picture-0][tile-map-collision-0]
![title-map-collision-picture-1][tile-map-collision-1]

![movement-picture-0][movement-0]

![entity-collision-picture-0][entity-collision-0]

![enemy-follow-picture-0][enemy-follow-0]
![enemy-follow-picture-1][enemy-follow-1]

![shooting-picture-0][shooting-0]

![start-screen-picture-0][start-screen]

![items-picture-0][items-0]

![end-game-picture-0][end-game]

[original-tiles-0]: 		http://i1055.photobucket.com/albums/s515/nkanedevn/original-tile_zpspxkhw4wm.png
[original-tiles-1]:		http://i1055.photobucket.com/albums/s515/nkanedevn/original-tile-map-1_zpskuusbsdr.png
[tile-map-collision-0]: 	http://i1055.photobucket.com/albums/s515/nkanedevn/collision-detection-0_zpsiqawp5ha.png
[tile-map-collision-1]:         http://i1055.photobucket.com/albums/s515/nkanedevn/collision-detection-1_zpsbpcrwl2t.png
[movement-0]:  			http://i1055.photobucket.com/albums/s515/nkanedevn/collision-detection_zps8zibtv7h.gif
[entity-collision-0]: 		http://i1055.photobucket.com/albums/s515/nkanedevn/enemy-collision_zpsyfy1ib12.png
[enemy-follow-0]: 		http://i1055.photobucket.com/albums/s515/nkanedevn/enemy-follow_zpspadiz6dq.gif
[enemy-follow-1]:		http://i1055.photobucket.com/albums/s515/nkanedevn/enemy-follow-and-random-state_zps4fhysakr.gif
[shooting-0]:			http://i1055.photobucket.com/albums/s515/nkanedevn/shooting-temp_zpsnshot0tq.gif
[start-screen]:			http://i1055.photobucket.com/albums/s515/nkanedevn/start_zpsqvly4lhd.gif
[items-0]:  			http://i1055.photobucket.com/albums/s515/nkanedevn/items_zps6r3ndnpv.gif
[end-game]:			http://i1055.photobucket.com/albums/s515/nkanedevn/depth-crawler_zpsuc3vf3hb.gif
[emscripten-compiler]: 		http://kripken.github.io/emscripten-site/
[ld-jam]:			https://ldjam.com/
[raylib-web]:			http://www.raylib.com/
[raylib-starter-kit]:		https://github.com/Hidden-Pixel/raylib-starter-kit
[depth-crawler-web]:		https://nkanedev.itch.io/depth-crawler
[binding-of-isaac]:		http://bindingofisaac.com/		
