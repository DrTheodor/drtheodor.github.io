---
title: Writing a JSON Serialization Library
---

## The Why

So I was working on one [Minecraft mod](https://modrinth.com/mod/ait), which does a lot of arbitrary data serialization.

You see, the game handles the hardest parts of actual serialization and network synchronization on its own, you just have to ask it nicely for what you want to read... But we didn't want to do all that. The team leader asked me real nicely to use GSON (Google's JSON serialization library) for serialization of the information.

GSON has this very neat feature where you give it an object and it spews out a JSON string (or a tree). 

Even though I've protested against it, nobody really seemed to care so I just went along with it, knowing full well that it will come back to bite my ass in the future (since most of the performance fixes come from me any way).

And bite my ass in the future it did. Recently (to be more precise after our new release), I've been starting to get reports of our official MC server crashing. No surprise there: the server just couldn't bear the sheer amount of TARDISes (and their worlds). I quickly brushed it off, thinking it's no biggie and after increasing the allocated RAM for the server everything seemed to be working fine...

Until it didn't. Random stutters every now and then, more than 10 people online frequently caused TPS drops. And it's not like the server's running on a potato! 12GBs of RAM should be more than enough to take on more than 10 people on a Fabric server (with optimization mods!).

So I've decided to check the timings report using spark. What I saw didn't really surprise me: most of the ticking method's time was taken by block/chunk operations and the networking serialization. 

After thinking about it, I've remembered that once after restarting the server I've decided to make sure that everything's going alright. I've opened the console and... what I saw didn't really appeal to me. For some saved files it took up to 600ms to get fully read! 

So I've decided to write my own serialization library. Thinking past, I've already wanted to do this before. GSON wasn't as flexible for us as it could've been: we've basically had to scrap backwards compatibility on multiple releases because there was no good way to fix up the old data.

## The How

To do better than what is currently in use you have to understand how it works. For me, having some experience in the Java's dark side, one issue immediately stood clear: GSON used reflections.

Reflections on their own aren't really a problem when you use them once or twice. But generally, they're slow. Originally, I wanted to replace them with `MethodHandle`s and `LambdaMetafactory`s but then I've realised that it's too cluttery. And after doing some research I've found out that method handles aren't really aa fast when you don't put them in a static final field.

"You can't define static fields dynamically!"... Or can you? My mind immediately portrayed the pain and suffering I've had with bytecode manipulation before and I was starting to get mentally prepared for what's coming next. I took a final look at the StackOverflow question and... 

Oh? What's that? `Unsafe`? You can get and set fields dynamically using it? Why didn't anybody tell me before?!

Using the unsafe API it's possible to get a field's offset in the memory and then get and set it!

Amazing!

Great!

Ah, fuck. Objects and primitives take different amount of space in the memory. And there are also boxed primitive types which are objects but can be unboxed into primitives... Argh! 

// WIP