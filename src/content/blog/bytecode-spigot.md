---
title: Bytecode sorcery on SpigotMC and its derivatives
description: 'A how-to guide to make "bytecode manipulation" and "Spigot" best friends.'
pubDate: 'Aug 26 2024'
heroImage: './assets/bytecode.webp'
category: Programming
tags:
    - Java
    - Bytecode Manipulation
    - Minecraft
---

SpigotMC and its derivatives (technically, Bukkit and its derivatives but who cares) are known to be the best for running Minecraft servers (or, well, were before Fabric came along)!
Unfortunately, as a plugin developer you do not have the luxury to do Mixins like you can in Fabric or Forge, which allow the developer to change Minecraft's code.

Instead you're stuck using [reflection hacks](https://github.com/dmulloy2/ProtocolLib) and Spigot's API. But sometimes there's no proper event, or that event doesn't allow you to edit something
or just plainly there's no API for something. Perhaps you want to fix a long standing bug or debug the server while playing on that server in runtime.

That's where something like Mixins would work best (except for, maybe, the last part)!

# How?

Well first you'd need to know a bit of bytecode sorcery, I'd recommend reading my [guides](/blog/tags/bytecode%20manipulation) on ObjectWeb ASM, since this guide will use it extensively.

Since hi-jacking the class loaders would be borderline impossible, I opted in to use Java Agents and Instrumentation API.

To avoid doing a lot of wheel-reinvention, we will use [Byte Buddy Agent](https://github.com/raphw/byte-buddy/tree/master/byte-buddy-agent) to
self-inject the Java Agent into the JVM, as well as ObjectWeb ASM 9.5 to do the actual byte part of the bytecode.

# Let's start
So first we need to make sure that our plugin runs as early as possible. 
We'll add `load: STARTUP` to our `plugin.yml`.

Also, since we use the libraries I've mentioned earlier, let's not waste space and time on shadowing them in, and instead put
```yaml
libraries:
  - org.ow2.asm:asm:9.5
  - net.bytebuddy:byte-buddy-net.bytebuddy.agent:1.14.10
```

into our `plugin.yml`.

In the end, we got something like this:
```yaml
name: your-plugin
version: '${version}'
main: your.plugin.main.ClassPath
api-version: '1.20'
load: STARTUP
libraries:
  - org.ow2.asm:asm:9.5
  - net.bytebuddy:byte-buddy-net.bytebuddy.agent:1.14.10
```

Then let's write our own `ClassFileTransformer` implementation:
```java
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;
import net.bytebuddy.agent.ByteBuddyAgent;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;

// ...

public class ClassTransformer implements ClassFileTransformer {

    private static final String ATTACH_MOD_PATH = "jmods/jdk.attach.jmod";
    private final Instrumentation instrumentation;

    private final Multimap<Class<?>, TransformQuery> queries = ArrayListMultimap.create();

    public ClassTransformer() {
        this.instrumentation = ByteBuddyAgent.install();
        this.instrumentation.addTransformer(this, true);
    }

    public void retransformAll(Collection<TransformQuery> queries) {
        try {
            this.queries.clear();

            for (TransformQuery query : queries) {
                this.queries.put(query.clazz(), query);
            }

            this.instrumentation.retransformClasses(this.queries.keySet().toArray(new Class[0]));
        } catch (UnmodifiableClassException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public byte[] transform(ClassLoader loader, String path, Class<?> clazz, ProtectionDomain domain, byte[] bytes) {
        Collection<TransformQuery> queries = this.queries.get(clazz);

        if (queries.isEmpty())
            return bytes;

        ClassReader reader = new ClassReader(bytes);
        ClassWriter writer = new ClassWriter(reader, ClassWriter.COMPUTE_FRAMES);

        for (TransformQuery query : queries) {
            query.function().apply(reader, writer);
        }

        return writer.toByteArray();
    }
}
```

Let's break it down. You should be familiar to the `ClassFileTransformer` interface if you've read my previous posts.
First we check if we're running a JDK and attempt to load `tools.jar` early, which `ByteBuddyAgent` will utilize to hi-jack the JVM into loading an agent.

The `TransformQuery` class is just a record containing info on how and what to transform:
```java
// ...

public record TransformQuery(Class<?> clazz, String method, BiFunction<ClassReader, ClassWriter, ClassVisitor> function) { }
```

Then we can just create as many transform queries as we want and supply it with a class visitor, which will edit the bytecode!

# Troubleshooting
It all worked great, until it didn't. Everything was working on my machine, but running it on a server hosting brought some troubles.

The server I was making the plugin for was using a hosting that had a different Java location...
So I had to use a patched version of the `ByteBuddyAgent`.
Essentially, the fix was just replacing the usual Java finding logic with this one:
```java
String java = System.getProperty("java.bin", null);

if (java == null) {
    java = System.getProperty(JAVA_HOME) + File.separatorChar + "bin" + File.separatorChar + (System.getProperty(OS_NAME, "")
            .toLowerCase(Locale.US).contains("windows") ? "java.exe" : "java");
}

// create the ProcessBuilder with the `java` variable
```

Then, in the `ClassTransformer.java`, in the constructor, before installing the `ByteBuddyAgent` I added special handling just in case of server hostings:
```java
ClassLoader loader = ClassLoader.getSystemClassLoader();

String javaHome = System.getProperty("java.home");
File java = new File(javaHome);

if (loader instanceof URLClassLoader urlLoader) {
    try {
        Method method = URLClassLoader.class.getDeclaredMethod("addURL", URL.class);
        method.setAccessible(true);

        File toolsJar = new File(java, "lib/tools.jar");
        if (!toolsJar.exists())
            throw new RuntimeException("Not running with JDK!");

        method.invoke(urlLoader, toolsJar.toURI().toURL());
    } catch (Exception exception) {
        exception.printStackTrace();
    }
} else {
    Path attachMod = java.toPath().resolve(ATTACH_MOD_PATH);

    if (Files.notExists(attachMod)) {
        throw new RuntimeException("Not running with JDK!");
    }
}

if (javaHome.contains("that-one-hosting")) {
    String[] split = javaHome.split("/");
    System.setProperty("java.bin", Path.of(javaHome, "bin", split[split.length - 1]).toString());
}
```

That hosting would put the Java binaries one directory deeper, which would confuse the hell out of `ByteBuddyAgent` causing it to explode and not work.

# Outro
All in all, this was quite interesting to code. With that knowledge I made 3 plugins, 2 of which are publicly available on GitHub.

[This](https://github.com/TheGridSMP/curator) one is basically the result of this tutorial, and [this](https://github.com/TheGridSMP/byteflow)
one is a SpongePowered Mixins parod which is quite cool if you ask me.