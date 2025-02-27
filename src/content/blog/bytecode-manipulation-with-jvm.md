---
title: Bytecode manipulation in JVM
description: 'An introduction to bytecode manipulation with Java!'
pubDate: 'Feb 09 2024'
heroImage: './assets/bytecode.webp'
category: Programming
tags:
    - Java
    - Bytecode Manipulation
---

## Bytecode manipulation?
Bytecode manipulation is a thing that allows you to dynamically inject/modify/overwrite code in JVM apps. So yes, this will work for not just Java, but also Kotlin, Scala and Groovy.

This doesn't seem very practical, but it's very useful in games running on JVM. For example: Minecraft! Minecraft's modding tools (Mixins) use bytecode manipulation to modify Minecraft's code.
Also, it's important to know how JVM works behind the wall... i think.

## The structure
TODO

## Fine. But how?
Well, first, you'd need to understand how JVM works.
When you compile your `.java` files you get `.class` files. Class files are the bytecode. Bytecode is a sequence of bytes, that describes the... well, code.

Each byte is a different instruction (or character, if it's a string). Don't worry, you won't have to memorize what byte corresponds to what instruction.

So what you need to do, to modify bytecode of a class, you just need to parse the bytes, change a few bytes and write it back! Sounds rather simple, but _how do you make JVM load the modifed class_ instead of the original? And is there a _more convenient way of parsing bytecode_? I mean, it's gonna get nasty when you'll try to build a house with a stone hatchet.
I'll break this article into multiple parts:
- [What libraries to use?](#libraries)
- [How to load modified bytes?](#how-to-load-the-modified-class)
  - [ClassLoaders](#1-classloaders)
    - [Defining classes dynamically](#defining-classes-dynamically)
    - [Intercepting class loading](#intercepting-class-loading)
  - [Agents](#2-agents)
    - [Self-attaching an agent](#self-attaching-an-agent)
    - [Implementing an agent](#implementing-an-agent)
    - [Using an agent](#using-an-agent)
  - [Changing the bytecode](#changing-the-bytecode)

## Libraries
There are not many bytecode manipulation libraries we can use out there. Here are some of the most popular solutions:

### [ObjectWeb ASM](https://gitlab.ow2.org/asm):
- Active development.
- License: `BSD 3-Clause "New" or "Revised" License`.
- Apparently, used by Java's compiler, SpongePowered's Mixins and various build tools.
- Low level.

### [Javassist](https://github.com/jboss-javassist/javassist):
- Isn't developed actively anymore, but mostly works.
- Some features do not work (after Java 11 and/or Java 17).
- License: `MPL`.
- High level.

### [cglib](https://github.com/cglib/cglib):
- Not supported anymore.
- License: `Apache License 2.0`.
- Low level.

### [ByteBuddy](https://github.com/raphw/byte-buddy):
- Active development.
- Abstracts bytecode manipulation a lot.
- License: `Apache License 2.0`.
- High level.

Which one of these to use? The answer is, as always, it depends. 
If you want to generate some code (if you're making a gradle plugin for example), then you'll likely find ByteBuddy the easiest to use.
If you want full control - you'll find that ASM is your only option.
If you want to hack something quickly without putting too much effort, Javassist may be the tool for you.

In this blog post I'm going to cover the use of ObjectWeb ASM and some of the ByteBuddy's tooling (more on that later).


## How to load the modified class?
Let's say that we modified a class, or we loaded it from memory. How to make JVM load the class from bytes?
Really, there are 2 solutions, and you should choose which one to use depending on your use-case.

Here's a quick comparison between the solutions. I would still recommend to read the rest of the section, because it's important to know how they work.
|                             | ClassLoaders | Agents |
|-----------------------------|:------------:|:------:|
| Re-define loaded classes    |      ❌      |   ✅   |
| Intercept JVM class loading |      ✅      |   ✅   |
| Define classes              |      ✅      |   ❌   | 



### 1. ClassLoaders
ClassLoaders are special classes that handle class loading, and, conveniently, they have a protected method, called `defineClass` which accepts an array of bytes (the bytecode), it's length, offset and the class' name.
Unfortunately, in the latest Java versions you can't use reflections to invoke that method, so you have to subclass the ClassLoader and override the method.


#### Defining classes dynamically:
If you override the method and make it public, it will allow you to define classes dynamically at runtime!
```java
// This classloader allows other classes to define classes at runtime!
public class CustomClassLoader extends ClassLoader {

    @Override
    public Class<?> defineClass(String name, byte[] bytes, int offset, int length) {
        return super.defineClass(name, bytes, offset, length);
    }

    // An utility method, a shortcut for the method above.
    public Class<?> defineClass(String name, byte[] bytes) {
        return this.defineClass(name, bytes, 0, bytes.length);
    }
}

CustomClassLoader loader = ...;
byte[] bytes = getBytecode();

Class<?> clazz = loader.defineClass("name/of/the/Class", bytes);
```

UPD: You can also use `MethodHandles` to define classes dynamically!
```java
MethodHandles.Lookup lookup = MethodHandles.lookup(); // any other way of getting the lookup class will do
byte[] bytes = getBytecode();

lookup.defineClass(bytes);
```

#### Intercepting class loading:
JVM calls the `defineClass` method as well! So if you just insert a check there, you can get away with modifying some class' code.

> Warning: you either need to force load the classes to load from the custom class loader, or make it the context class loader for this thread.
```java
// This classloader allows other classes to define classes at runtime!
public class CustomClassLoader extends ClassLoader {

    @Override
    public Class<?> defineClass(String name, byte[] bytes, int offset, int length) {
        if (name.equals("name/of/the/Class"))
            super.define(name, transform(bytes), offset, length);

        return super.defineClass(name, bytes, offset, length);
    }
}

CustomClassLoader loader = ...;
Thread.currentThread().setContextClassLoader(loader);
// or
loader.loadClass("name.of.the.Class");
```

### 2. Agents
Agents are a wonderful thing. They were meant for debugging & profiling tools, but we can use it's functionality to our advantage!
> Warning: you can't use agents without the JDK!

Agents can't define new classes, but they can _re-define_ classes and _intercept class loading_ without having to do class loader juggling.
Quite amazing if you ask me.

One slight problem though: to get your agent running, you need to put it in the run arguments of JVM, like this:
```bash
java -javaagent:agent.jar -jar app.jar
```

If you can't have that (for example in Minecraft), then you'll likely want to use a self-attaching agent. If you don't mind using the command argument, you can move on to [Using an Agent](#using-an-agent) section.

#### Self-attaching an agent
There are ways to screw around with agents and force the JVM to self-attach it, but it's unnecessary complicated and really based on hopes and dreams.

There is a way to do this more conveniently though. Remember when I said I'll cover ByteBuddy's tooling earlier? The time has come!
Introducing, [ByteBuddy Agent](https://javadoc.io/doc/net.bytebuddy/byte-buddy-agent/1.10.4/net/bytebuddy/agent/ByteBuddyAgent.html)! It's a library made for ByteBuddy, but very convenient for our use case as well!

To use it, just put [it](https://mvnrepository.com/artifact/net.bytebuddy/byte-buddy-agent) in the dependencies in your build system and hook the agent:
```java
Instrumentation instrumentation = ByteBuddyAgent.install();
``` 

#### Implementing an agent
Agents have 2 entrypoints: `premain` and `agentmain`. The first one gets executed after JVM got loaded, but before the app did, and the latter gets executed after JVM initializes the app.

```java
public class Agent {

    public static void premain(String args, Instrumentation instrumentation) {
        // ...
    }

    public static void agentmain(String args, Instrumentation instrumentation) {
        // ...
    }
}
```

(You don't have to add both entrypoints if you use just one though)

Make sure to add these entries to your manifest file, or it won't work!
```yaml
Agent-Class: path.to.your.Agent
Premain-Class: path.to.your.Agent
Can-Redefine-Classes: true
Can-Retransform-Classes: true
```

(The last 2 entries are optional, but make sure to include them as well, or you might lose some functionality!)

#### Using an agent
Once you get an [`Instrumentation`](https://docs.oracle.com/en/java/javase/17/docs/api/java.instrument/java/lang/instrument/Instrumentation.html) object, you can use it to re-define classes and register a [`ClassFileTransformer`](https://docs.oracle.com/en/java/javase/17/docs/api/java.instrument/java/lang/instrument/ClassFileTransformer.html), which in turn allows you to intercept class loading.

```java
public class CustomTransformer implements ClassFileTransformer {

    @Override
    public byte[] transform(ClassLoader loader, String name, Class<?> clazz, ProtectionDomain domain, byte[] bytes) {
        // ...
        return bytes;
    }
}

instrumentation.addTransformer(new CustomTransformer(), true);
```

(You can actually return a `null` in the `transform` method for this specific case, since we don't do any changes to the array... yet.)

### Changing the bytecode
Now that you have a byte array and a place to put it - let's do something with it!
First, we need to read that array then you do something with it and write it back to a byte array!

```java
ClassReader reader = new ClassReader(bytes);
ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_FRAMES);

// ...

return writer.toByteArray();
```

Now, you can use the potential of ASM to do whatever you want!
If you want a guide on how to use ObjectWeb ASM please let me know in the comments.