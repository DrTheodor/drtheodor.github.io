---
title: How I ported a Fabric mod to Forge without rewriting it.
description: 'An incredibly overcomplicated way of porting Fabric mods to Forge.'
pubDate: 'Aug 25 2024'
heroImage: './assets/blog-placeholder-1.jpg'
category: Programming
tags:
  - Java
  - Minecraft
---

Everyone knows that Minecraft Forge sucks.

I'm not a fan of making Forge mods. But unfortunately, the amount of Forge mods that actually add content is quite big, compared to Fabric.

People started using Synitra Connector, a mod that allows to run Fabric mods on Forge (with a biiiit of overhead) which caused numerous problems.

So I decided to find out how hard can it be to port a mod to Forge without actually porting it.

# But why?
Wasting precious time on a Forge port sucks. No one wants to deal with it. While tools like Architectury do exist, it's better to use it from the start if you're planning to 
do Forge support. Since then it might be just too late, since your code will be filled with Fabric API.

# But how?

To make that happen, we need to understand what's the core difference between a Forge mod and a Fabric mod, which is:
1. Minecraft mappings.
Fabric uses Intermediary mappings and Forge uses SRG mappings (MCP? i dont really know and it doesn't really matter).
2. Metadata.
Fabric has a `<modid>.mod.json` and Forge uses `mods.toml` and `MANIFEST.MF`.
3. Running it at the right time.
Since the modloaders run their mods in a different way, you need to hook them up in a special way.

Metadata is the easiest part. Anyone could write a script to magically turn a `.mod.json` into `mods.toml`. Or do it by hand. But mappings...
That's the most interesting part!

## Mappings

Intermediary mappings are easy to find. Here's the mapping file for [1.20.1](https://raw.githubusercontent.com/FabricMC/intermediary/master/mappings/1.20.1.tiny).

SRG is a bit harder. I had to go through MCP Config and find the 1.20.1 TSRG mappings (unfortunately I do not have the link on me, but I'm sure you can find it if you search for it).

One problem... the TSRG mappings I found and a decompiled Forge mod that I used as a reference seemed to show that the classnames are from Mojang mappings,
which complicated the task even more.

Mojang has their own mappings for different versions since 1.14, you can find all you need [here](https://piston-meta.mojang.com/mc/game/version_manifest.json).

Another problem. Mojang mappings come separately: for a client and a server.

## Mapping Thaumaturgy
To juggle the mapping files I used MappingIO library by FabricMC.

I wrote a class that would:
1. Join the server and client Mojang mappings.
2. Remap Intermediary methods and fields to SRG ones (if a mapping exists, otherwise don't translate)
3. Remap the leftover obfuscated mappings to SRG ones (since intermediary is incomplete, there is a chance you'll stumble upon an obfuscated element)
4. Remap Intermediary class names to Mojang ones.

I achieved all of this with this code:
```java
package dev.drtheo.aitforger.remapper.mappings;

import dev.drtheo.aitforger.remapper.asm.desc.FieldDesc;
import dev.drtheo.aitforger.remapper.asm.desc.MethodDesc;
import dev.drtheo.aitforger.remapper.api.MappingProvider;
import net.fabricmc.mappingio.MappedElementKind;
import net.fabricmc.mappingio.MappingVisitor;
import net.fabricmc.mappingio.adapter.ForwardingMappingVisitor;
import net.fabricmc.mappingio.tree.MappingTree;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.util.List;

// official.accept(Intr2Mcp <- intermediary, mcp)
public class Intr2McpMappingAdapter extends ForwardingMappingVisitor implements MappingProvider {

    private final MappingTree intermediary;
    private final MappingTree mcp;

    public Intr2McpMappingAdapter(MappingVisitor parent, MappingTree intermediary, MappingTree mcp) {
        super(parent);

        this.intermediary = intermediary;
        this.mcp = mcp;
    }

    @Override
    public void visitNamespaces(String s, List<String> list) throws IOException {
        super.visitNamespaces("intermediary", List.of("srg"));
    }

    private MappingTree.ClassMapping interClass;

    private MappingTree.ClassMapping mcpClass;
    private MappingTree.FieldMapping mcpField;
    private MappingTree.MethodMapping mcpMethod;

    @Override
    public boolean visitClass(String srcName) throws IOException {
        this.interClass = this.intermediary.getClass(srcName);

        this.mcpClass = this.mcp.getClass(srcName);
        return super.visitClass(this.getClass(srcName));
    }

    @Override
    public boolean visitField(String srcName, @Nullable String srcDesc) throws IOException {
        this.mcpField = this.mcpClass.getField(srcName, srcDesc);

        FieldDesc desc = FieldDesc.of(srcName, srcDesc)
                .remap(this);

        return super.visitField(desc.name(), desc.desc());
    }

    @Override
    public boolean visitMethod(String srcName, @Nullable String srcDesc) throws IOException {
        this.mcpMethod = this.mcpClass.getMethod(srcName, srcDesc);

        MethodDesc desc = MethodDesc.of(srcName, srcDesc)
                .remap(this);

        return super.visitMethod(desc.name(), desc.desc());
    }

    @Override
    public void visitDstName(MappedElementKind targetKind, int namespace, String name) throws IOException {
        String result = name;

        if (targetKind == MappedElementKind.FIELD)
            result = this.mcpField.getDstName(0);

        if (targetKind == MappedElementKind.METHOD)
            result = this.mcpMethod.getDstName(0);

        super.visitDstName(targetKind, namespace, result != null ? result : name);
    }

    @Override
    public String getClass(String type) {
        MappingTree.ClassMapping mapping = this.intermediary.getClass(type);

        if (mapping == null)
            return type;

        String result = mapping.getDstName(0);

        if (result != null)
            return result;

        return type;
    }

    @Override
    public String getMethod(String ownerName, String name, String desc) {
        if (this.interClass == null)
            return name;

        MappingTree.MethodMapping mapping = this.interClass.getMethod(name, desc);

        if (mapping == null)
            return name;

        String result = mapping.getDstName(0);

        if (result != null)
            return result;

        return name;
    }

    @Override
    public String getField(String ownerName, String name, String desc) {
        if (this.interClass == null)
            return name;

        MappingTree.FieldMapping mapping = this.interClass.getField(name, desc);

        if (mapping == null)
            return name;

        String result = mapping.getDstName(0);

        if (result != null)
            return result;

        return name;
    }
}
```

Which I then fed into official mappings like this:
```java
VisitableMappingTree result = new MemoryMappingTree();
MappingTree merged = merge(client, server);

VisitableMappingTree mcp = read(srg, MappingFormat.TSRG_2_FILE);
VisitableMappingTree intermediary = read(tiny, MappingFormat.TINY_FILE);

merged.accept(new Intr2McpMappingAdapter(result, intermediary, mcp));
```

Obviously, you also would need to merge the Mojang client and server mappings, which I did like this:
```java
public static MappingTree merge(Path clientPath, Path serverPath) throws IOException {
    long start = System.currentTimeMillis();
    VisitableMappingTree merged = new MemoryMappingTree();

    MappingReader.read(clientPath, MappingFormat.PROGUARD_FILE, merged);
    MappingReader.read(serverPath, MappingFormat.PROGUARD_FILE, merged);

    VisitableMappingTree result = new MemoryMappingTree();
    merged.accept(new MappingSourceNsSwitch(result, "target"));

    LOGGER.debug("Finished merging vanilla mappings in %dms", System.currentTimeMillis() - start);
    return result;
}
``` 

To apply the mappings I've used tiny-remapper, also made by the folks at FabricMC.
And voila! You have a jar that if you run the entrypoint at a proper time, will work on Forge natively, even though it's a Fabric mod.

## Hooking it up
You can start with a wrapper mod. It will have the additional mixins and code to hook up the remapped jar properly.

In this example, I'll be showing you how to hook up a Fabric mod that has an entrypoint to client and common side code.

We'll start with a method that just runs the entrypoints.

```java
public static void load() {
    JukeAttributes.inject();
    new MyMod().onInitialize();

    if (FMLEnvironment.dist == Dist.CLIENT)
        new MyModClient().onInitializeClient();

    JukeAttributes.release();
    finishedLoading = true;
}
```

We use `FMLEnvironment.dist` to get the current execution side. We also mark that we finished loading the mod to avoid the initialization happening twice.

One interesting thing is `JukeAttributes` (credits to [Synitra](https://github.com/Sinytra/Connector/blob/1.21.x/src/mod/java/org/sinytra/connector/mod/compat/LazyEntityAttributes.java)).

It initializes fake attributes with real registry names of real attributes that will get registered later.

Now where do we execute that load method? 
1) Client has to be initialized after some initialization in the `MinecraftClient` class, and I've found that mixing in `RenderSystem#initBackendSystem`
works like a charm.

2) Server (obviously) doesn't execute any of the client render code, so we have to mixin into `net.minecraft.server.Main#main`.

Now if both your remapped jar and the wrapper jar get loaded (are on classpath) then it will work!

To achieve that you can use jar-in-jar from Forge Gradle or write a task that builds the container jar first and then copies the remapped jar to the generated resources of the full jar.

If your mod uses Fabric API then just use Forgified Fabric API, or rewrite it yourself!
Remember, you can always re-implement some Fabric stuff since you're controlling the remapping process. I wrote an additional mapping file that would
remap all the Fabric Loader API calls to a semi-assed implementation of it in my full mod jar.

The mapping looked something like this:
```
v1	original	remapped
CLASS	net/fabricmc/api/ClientModInitializer	dev/drtheo/<mod>/remapped/net/fabricmc/api/ClientModInitializer
CLASS	net/fabricmc/api/ModInitializer	dev/drtheo/<mod>/remapped/net/fabricmc/api/ModInitializer
CLASS	net/fabricmc/loader/api/FabricLoader	dev/drtheo/<mod>/remapped/net/fabricmc/loader/api/FabricLoader
CLASS	net/fabricmc/api/EnvType	dev/drtheo/<mod>/remapped/net/fabricmc/api/EnvType
CLASS	net/fabricmc/api/Environment	dev/drtheo/<mod>/remapped/net/fabricmc/api/Environment
CLASS	net/fabricmc/fabric/api/screenhandler/v1/ScreenHandlerRegistry	dev/drtheo/<mod>/remapped/net/fabricmc/fabric/api/screenhandler/v1/ScreenHandlerRegistry
CLASS	net/fabricmc/fabric/api/screenhandler/v1/ScreenHandlerRegistry$SimpleClientHandlerFactory	dev/drtheo/<mod>/remapped/net/fabricmc/fabric/api/screenhandler/v1/ScreenHandlerRegistry$SimpleClientHandlerFactory
CLASS	net/fabricmc/loader/api/ModContainer	dev/drtheo/<mod>/remapped/net/fabricmc/loader/api/ModContainer
CLASS	net/fabricmc/fabric/api/command/v2/ArgumentTypeRegistry	dev/drtheo/<mod>/remapped/net/fabricmc/fabric/api/command/v2/ArgumentTypeRegistry
```

Then I just re-implemented those classes and voila!
It works!

# Outro
I hope this guide helps someone to understand the internals of the modloaders and how they work. Maybe someone will even attempt to do the same I did for this post.