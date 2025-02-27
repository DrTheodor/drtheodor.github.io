---
title: Basics of ObjectWeb ASM in Java
description: 'The basics of ObjectWeb ASM in Java.'
pubDate: 'Feb 13 2024'
heroImage: './assets/blog-placeholder-1.jpg'
category: Programming
tags:
    - Java
    - Bytecode Manipulation
draft: true
---

I'm assuming you already added ASM to your dependencies, so let's get started!

First, you need to read the bytecode of a class and write it back. So let's implement this real quick, so we have a foundation to work on later:
```java
byte[] bytes = ...;
ClassReader reader = new ClassReader(bytes);
ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_FRAMES);

return writer.toByteArray();
```

Let's dissect this piece of code. We have a byte array (the bytecode of the class), then we do something with the reader and writer and return the byte array.

If you want to know how to modify a class in runtime, check my [other](/blog/bytecode-manipulation-in-jvm) article.

`ClassReader` parses the bytes and `ClassWriter` does the exact opposite, returning the bytes.

The argument in `ClassWriter`'s constructor (`COMPUTE_FRAMES`) means that we want the writer to compute the frames for us. Frames are parts of method code. Also, that means that the writer will compute the maximums (aka `maxs`) of the method.
You can also pass `COMPUTE_MAXS` or no arguments at all, to create a writer that will suit your needs.

## ASM's APIs
ASM has 2 APIs to analyze/modify bytecode: event-based and tree-based API.

### Event-based
Exactly what you think. The way of using this API is to subclass the `Visitor` classes (`ClassVisitor`, `MethodVisitor`, `FieldVisitor` and etc).

*add code snippet*


### Tree-based
This API is much more suitable for analyzing the bytecode, since it first parses the bytecode with the event-based API and puts the data into objects, giving you various node objects, which you can read and modify the properties of, including method instructions!

*add code snippet*


### Utilizing an API
Whichever API you chose, you'll still have to pass the parsed bytecode to your classes and put the result into the writer.

```java
// Event-based API
ClassVisitor cv = new MyClassVisitor(writer);
reader.accept(cv); // reader's data -> visitor 

// Tree-based API
ClassNose node = new ClassNode();
reader.accept(node); // reader's parsed stuff -> node (visitor)
node.accept(writer); // node's data -> writer
```

Let's break it down! When you pass the writer to your visitor, you're making sure that after you filter/modify everything you need in the class, the calls will pass down to the parent visitor. Here, it's the `ClassWriter`, so you will write the filtered result of your class visitor to the class writer!

When you call `accept` on the reader for your visitor, it will pass down the parse results of the reader to the supplied visitor.

In tree-based API, we call `accept` as well, but this time it makes the parsed data go to the supplied visitor (the writer).

*WRITING IN PROGRESS*