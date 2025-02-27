---
title: Writing Seamless Teleportation for a Minecraft mod
description: 'A story about how I wrote a seamless teleportation util for a minecraft mod.'
pubDate: 'Jan 09 2025'
heroImage: './assets/blog-placeholder-3.jpg'
category: Programming
tags:
  - Java
  - Minecraft
draft: true
---

So I was working on the [Adventures in Time](https://github.com/pavatus/ait) mod when the lead dev, [Loqor](https://github.com/Loqor)
sent me a message in discord, asking, if I could write seamless teleportation for the mod.

The mod itself adds TARDIS from "Doctor Who". TARDIS is a phone box that is bigger on the inside, and, 
obviously, having a seamless teleportation effect would be cool.

Not to mention the competitors don't have this feature, so I started working on it.

## Vanilla behavior
In vanilla, when you teleport between worlds (TARDIS' interior is located in a separate world to achieve bigger
on the inside effect) you see the "Loading world" screen, while the chunks and world data gets loaded.

We wanted to get rid of it.

To teleport a player between dimensions, a vanilla Minecraft server sends a player respawn packet.
So I quickly mimicked it and made it send on a different name.

On the client I handled the packet, doing the exact same thing as vanilla but I've removed the part which adds the loading screen.

Half of the feature done!

## ..or is it?
Seamless teleportation works, but... You wouldn't really call *this* seamless. When you tp it will load the chunks
in a really obvious and an annoying way. So chunk loading was clearly need to be redone.

First things first, we need to send chunk data from server to client across dimensions.

I've added a preload map on the client, having worlds for keys and list of chunk datas as values.

Then I've replicated the handling of the chunk packet, thinking that it would do, but...

Chunk building & rendering has nothing to do with networking.

## On how the minecraft chunk system works (on client side)
When you join a world, the world renderer gets reset: it clears the caches and built chunks.

Then, it builds terrain, applies frustum culling and other stuff.

In the end it creates `BuiltChunk`s (note: the project is using yarn mappings, 1.20.1) and `RenderableChunk`s.

## how fix
First, I've tried to do the obvious. I reset the world renderer, as vanilla does, but instead of waiting for 
weather near the sea, I instead tried to build the chunks right away.

This created a bug. It basically created a mirror world from Doctor Strange.
The overworld was being rendered right below the interior world. Or, well, where it should've been rendered, 
because it was not.

// TODO: finisht this story