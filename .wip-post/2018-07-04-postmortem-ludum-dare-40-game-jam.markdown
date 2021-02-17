---
layout: post
Title: "Postmortem Ludum Dare 40 Game Jam"
date: 2018-07-04
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
of lack of preparation leading up to the jam, but all in all it was a expectional learning experience for myself. The theme
for the game was "the more you have the worse it gets".


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
[Binding of Issac][binding-of-isaac]. We started by attempting to create a basic layout for a tile-map that by drawing
some rectangles on the screen.

![original-tiles-picture-0][original-tiles-0]
![original-tiles-picture-1][original-tiles-1]

Next, we standardized a basic tile map size and had it render out basic static rooms with corridors between the room. We then
added another player rectangle that would be controlled by they player's input with no physics calculations and no collision
detection.


### Basic Procedural World Generation
The most experienced game developer on the team took on the challenging task of creating a basic tile based procedural world 
generation algorithm that would create small "islands" with "bridges" connecting them. The next few GIFs below this section
show of the code; however, it is probably difficult to tell. Unfortunately, we didn't take any gifs during this stage nor
screen shots to show off progress or funny bugs.


### Entity-Wall Collision
After player input was working correctly, we started to work on rectangluar collision for walls. The small blue rectangle in
these screen shots represented the collision region for the player and the red rectangles were the walls that were passed the
collision check. As seen in the second screen shot, collision was originally designed to be on the lower portion of the player,
because we intended to have the game art be isometric.

![title-map-collision-picture-0][tile-map-collision-0]
![title-map-collision-picture-1][tile-map-collision-1]


### On the Move
After we had a functional procedurally generated tile map, basic player input, and rectangular collision working properly.
We needed to start making the player's movement start to feel physics base. Personally, this was my first exposure to
using vector based math to do physics calculations; however, one of our team memebers was incredibly familiar with doing
these calculations. After a few whiteboarding session and reading a handful of game development articles on vector based
movement, a basic movement system for the player entity was created and used. The "warping" affect seen in the GIF below
was due to a miscalculation of the increased speed toggling from maximum to minimium on the player's velocity vector.

![movement-picture-0][movement-0]


### Finding a Path
Initially, we dropped another entity into the world as a way to testing out a simple method for path finding; however, time
was running short for us at this particular moment. Instead of implementing an actual path finding algorithm, we opted to
just implement a simple "line-of-sight" vector pathing that created a "follow" mechanic for the enemy to chase the player
whenever the player was within a particular range or "line-of-sight". We later decided to test this with multiple enemies,
and we found that the enemies would just idly stand in their particular position. Instead of the enemies boringly standing
still, a "random" wander mechanic was added for the enemy position whenever an enemy is standing idle.

![enemy-follow-picture-0][enemy-follow-0]
![enemy-follow-picture-1][enemy-follow-1]


### Entity-Entity Collision
In order to get other "enemy" entities in the world, we resorted to creating an entity array that contained the player entity
in combination with the rest of the "enemies" in the world at a fixed size. These were updated over every game update cycle.
Once we had our global entity array created, we hacked together a different function that would test for collisions between 
entities. Looking back at it now, we could have definitely re-used our tile collision code; however, two out of the three of
us are new at game development. Needless to say, mistakes were made and fun was had.

![entity-collision-picture-0][entity-collision-0]

### Let there be Bullets!
While being chased by enemies can be exciting, we wanted to add at least a shooting mechanic for the player that would give
them a fighting chance. I will not go in depth with how we implemented this, but it was a funny hack that we added to the
game toward the end of the jam. Once the player killed an enemy, another three enemies would spawn on the map following the
guidelines of the jam's theme, "the more you have the worse it gets".

![shooting-picture-0][shooting-0]

### A HUD, Start/End Screens, and Items?
One of the last things that we were able to actually get working properly was the in game HUD that displayed the player's
health, score, high score, start screen, and game over screen. We wanted to at least provide a minimal amount of information
to the player; however, the health system wasn't worked out properly at the end which is why in the GIF of the HUD reads
"Health: 100", but the player dies on the first hit from an enemy. On another note, enemies did not actually have health in
the version we released for the jam. It was basically, a one in ten chance that a particular bullet hitting an enemy would
"kill" it. This was due to the fact that we did not have a proper health system set up initially. We attempted to try to
squeeze in items for the player prior to release, and we got player's ability to pick up items working; however, we did
not have enough time to set up a trigger for functionality or increase an increase to the score thus we decided to leave it
out of the final version.

![start-screen-picture-0][start-screen]
![end-game-picture-0][end-game]
![items-picture-0][items-0]

### Thank you!
If you made it this far, I appreciate you reading this article. If you are interested in viewing the source code to this
engine it is located here [source code][source-code]. On another note, I wanted to thank all three the team memebers that
I worked with during this game jam: [Mikhail Swift][ms], [Nathan Shirley][ns], and Axel!


### In-Game Art
Axel made awesome art work for us to use; unfortunately, we did not have enough time to use the assets he created. I figured
that I might as well show them off here.

![hero-0][hero-0]
![hero-1][hero-1]
![hero-2][hero-2]
![hero-3][hero-3]
![gun-0][gun-0]
![whip-0][whip-0]
![sword-0][sword-0]
![mon-0][mon-0]

[original-tiles-0]: 		http://i1055.photobucket.com/albums/s515/nkanedevn/original-tile_zpspxkhw4wm.png
[original-tiles-1]:			http://i1055.photobucket.com/albums/s515/nkanedevn/original-tile-map-1_zpskuusbsdr.png
[tile-map-collision-0]: 	http://i1055.photobucket.com/albums/s515/nkanedevn/collision-detection-0_zpsiqawp5ha.png
[tile-map-collision-1]:     http://i1055.photobucket.com/albums/s515/nkanedevn/collision-detection-1_zpsbpcrwl2t.png
[movement-0]:  				http://i1055.photobucket.com/albums/s515/nkanedevn/collision-detection_zps8zibtv7h.gif
[entity-collision-0]: 		http://i1055.photobucket.com/albums/s515/nkanedevn/enemy-collision_zpsyfy1ib12.png
[enemy-follow-0]: 			http://i1055.photobucket.com/albums/s515/nkanedevn/enemy-follow_zpspadiz6dq.gif
[enemy-follow-1]:			http://i1055.photobucket.com/albums/s515/nkanedevn/enemy-follow-and-random-state_zps4fhysakr.gif
[shooting-0]:				http://i1055.photobucket.com/albums/s515/nkanedevn/shooting-temp_zpsnshot0tq.gif
[start-screen]:				http://i1055.photobucket.com/albums/s515/nkanedevn/start_zpsqvly4lhd.gif
[items-0]:  				http://i1055.photobucket.com/albums/s515/nkanedevn/items_zps6r3ndnpv.gif
[end-game]:					http://i1055.photobucket.com/albums/s515/nkanedevn/depth-crawler_zpsuc3vf3hb.gif
[hero-0]:					https://raw.githubusercontent.com/Hidden-Pixel/ludum-dare-40/textures/game/assets/hero/hero-walking/Hero%20Standing%20w%20Cape%20and%20Helmet.png
[hero-1]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/hero/hero-walking/Hero%20Walk%201.png?raw=true
[hero-2]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/hero/Hero%20Firing%20Weapons/Hero%20Firing%202%20w%20Cape%20.png?raw=true
[hero-3]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/hero/Hero%20Firing%20Weapons/Hero%20Firing%204.png?raw=true
[gun-0]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/items/Auto%20Gun%20Icon.png?raw=true
[whip-0]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/items/Whip%20Icon.png?raw=true
[sword-0]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/items/Sword%20Icon.png?raw=true
[mon-0]:					https://github.com/Hidden-Pixel/ludum-dare-40/blob/textures/game/assets/monsters/Monster%20Wallking%201%20copy%202.png?raw=true

[emscripten-compiler]: 		http://kripken.github.io/emscripten-site/
[ld-jam]:					https://ldjam.com/
[raylib-web]:				http://www.raylib.com/
[raylib-starter-kit]:		https://github.com/Hidden-Pixel/raylib-starter-kit
[depth-crawler-web]:		https://nkanedev.itch.io/depth-crawler
[binding-of-isaac]:			http://bindingofisaac.com/		
[source-code]:				https://github.com/Hidden-Pixel/ludum-dare-40
[ms]:						https://github.com/mikhailswift
[ns]:						https://github.com/natethegreat2525
