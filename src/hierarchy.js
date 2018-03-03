// @flow

'use strict';

import type {Executable, Director, ExecutionStatus} from './director'

/**
 * A hint to the host of whether this port should be made visible.
 * @todo: should also affect the connectability of the port?
 */
export type Visibility = "full" | "none" | "expert" | "notEditable";

export type Port<T> = InputPort<T>|OutputPort<T>;

export type Namespace = "components" | "ports" | "relations";

/**
 * An interface for named objects.
 */
export interface Nameable {
    /* The name of this object. */
    name: string;

    /* Return a globally unique identifier. */
    getFullyQualifiedName(): string;
}

/**
 * An extension of the Nameable interface for objects that
 * are part of a hierarchy. The type parameter denotes the
 * type of object that it can be contained by.
 */
export interface Containable<T> extends Nameable {
    /* The container of this object. */
    parent: ?T;
}

/**
 * A generic container. It can contain things that are named,
 * and it must have a name itself.
 */
export interface Container<T: Nameable> extends Nameable {

    /**
     * Add an element to this container. Return true if
     * the element was added successfully, false otherwise.
     * @param {T} element
     */
    add(element: T): boolean;

    /**
     * Return whether or not the argument is present in the container.
     * @param {T} element
     */
    has(element: T): boolean;

    /**
     * Get an element from this container.
     * @param {string} name
     * @param {Namespace} namespace
     */
    find(name: string, namespace: Namespace): mixed;

    /**
     * Get an elements held by this container.
     */
    getAll(): Array<mixed>;

    /**
     * Remove an element from this container.
     * @param {string} name
     */
    remove(element: T): void;

    /**
     * Add an element to this container. If a component with the same name
     * already exists, replace it.
     * @param {T} element
     */
    substitute(element: T): void;
}

/**
 * A base class for ports.
 */
export class PortBase<T> implements Containable<Actor> {
    /** The component this port is contained by. */
    parent: ?Actor;

    /** The name of this port. */
    name: string;

    /** The visibility of this port. */
    visibility: Visibility;

    /**
     * Construct a new port with a give name. Upon creation
     * it will not be associated to any component.
     * @param {string} name
     */
    constructor(name: string) {
        this.name = name;
        this.visibility = "full";
        (this: Containable<Actor>);
    }

    /**
     * Return the fully qualified name of this nameable based on its ancestry.
     */
    getFullyQualifiedName(): string {
        var prefix = "";
        if (this.parent != null) {
            prefix = this.parent.getFullyQualifiedName();
        }
        if (prefix != "") {
            return prefix + "." + this.name;
        } else {
            return this.name;
        }
    }
}

/**
 * An input port. The type parameter denotes the type
 * of values that to pass through this port.
 */
export class InputPort<T> extends PortBase<T> {

    /** A default value that is used when input is absent. */
    default: ?T;

    /** Whether or not this port allows multiple connections. By default it does not. */
    multiplex: boolean;

    /** Construct a new input port given a name and a set of options. */
    constructor(name: string, options?: ?{value?: T, visibility?: Visibility, multiplex?: boolean}, parent?: Actor) {
        super(name);
        this.multiplex = false;
        if (options != null) {
            this.default = options['value'];
            if (options['multiplex'] != null) {
                this.multiplex = options['multiplex'];
            }
            if (options['visibility'] != null) {
                this.visibility = options['visibility'];
            }
        }
        if (parent != null) {
            this.parent = parent;
            parent.add(this);
        }
        (this: Port<T>);
    }
}

/**
 * A parameter is an input port that has a default value, and that
 * value may or may not be updated by inputs.
 */
export class Parameter<T> extends InputPort<T> {

    update: boolean;

    /** Construct a parameter. It must have a value. */
    constructor(name: string, value: T, update?:boolean, parent?: Actor) {
        var obj = {default: value};
        super(name, obj, parent);
        if (update != null) {
            this.update = update;
        } else {
            this.update = false;
        }
        (this: Port<T>);
    }
}

/**
 * A collection of meta data that represents a port.
 */
export class OutputPort<T> extends PortBase<T> {
    spontaneous: boolean;

    /**
     * Construct a new output port given a name and a set of options.
     */
    constructor(name: string, options?: ?{spontaneous?: boolean, visibility?: Visibility}, parent?: Actor) {
        super(name);
        this.spontaneous = false;
        if (options != null) {
            if (options['spontaneous'] != null) {
                this.spontaneous = options['spontaneous'];
            }
            if (options['visibility'] != null) {
                this.visibility = options['visibility'];
            }
        }
        if (parent != null) {
            this.parent = parent;
            parent.add(this);
        }
        (this: Port<T>);
    }
}

/**
 * A base class for executable components. Importantly, components can only
 * be contained by a specific kind of component, namely a composite.
 * @todo: it might be a good idea to base this class of off EventEmitter.
 */
export class Component implements Containable<Composite>, Executable {

    name: string;
    parent: ?Composite;

    constructor(name: string, parent?: ?Composite) {
        this.name = name;
        if (parent != null) {
            this.parent = parent;
            parent.add(this);
        }
        (this: Containable<Composite>);
        (this: Executable);
    }

    /**
     * Return the fully qualified name of this nameable based on its ancestry.
     */
    getFullyQualifiedName(): string {
        var prefix = "";
        if (this.parent != null) {
            prefix = this.parent.getFullyQualifiedName();
        }
        if (prefix != "") {
            return prefix + "." + this.name;
        } else {
            return this.name;
        }
    }

    // **************************************
    //
    // interface Executable
    //
    // **************************************

    /**
     * Initialize the component as the first phase of its execution.
     */
    initialize(): void {

    }

    /**
     * Fire this component.
     */
    fire(): void {
    }

    /**
     * Only used in the context of SR where components need to fire multiple
     * times before they commit to a new state. The fire method of such
     * component must be side-effect-free.
     */
    postfire() {
    }

    /**
     * Clean up any state not to be carried over to the next execution.
     */
    wrapup(): void {
    }

    /**
     * Set the current execution status. Only to be called by the director.
     */
    setStatus(status: ExecutionStatus): void {
    }
}

/**
 * An actor is a component that contains ports and implements executable.
 */
export class Actor extends Component implements Container<Port<any>> {

    /** The input ports of this actor. */
    inputs: Map<string, InputPort<mixed>>;
    /** The output ports of this actor. */
    outputs: Map<string, OutputPort<mixed>>;

    /**
     * Constructs a new Actor with a specific name.
     */
    constructor(name: string, parent?: ?Composite) {
        super(name, parent);
        this.inputs = new Map();
        this.outputs = new Map();
        (this: Container<Port<mixed>>);
    }

    /**
     * Add a new port by name; return false if the port already exists.
     */
    add(port: Port<any>): boolean {
        if (this.inputs.has(port.name) || this.outputs.has(port.name)) {
            return false;
        }
        if (port instanceof InputPort) {
            // unlink
            if (port.parent != null) {
                port.parent.remove(port);
            }
            port.parent = this;
            this.inputs.set(port.name, port);
        }
        else if (port instanceof OutputPort) {
            if (port.parent != null) {
                port.parent.remove(port);
            }
            port.parent = this;
            this.outputs.set(port.name, port);
        }
        return true;
    }

    /**
     * Return the port associated to given name. If no such port exists, return
     * undefined.
     */
    find(name: string, namespace: Namespace): mixed {
        if (namespace != "ports") {
            throw "Actors only support the ``ports'' namespace.";
        }
        return this.findPort(name);
    }

    findInput(name: string): ?InputPort<mixed> {
        return this.inputs.get(name);
    }

    findOutput(name: string): ?OutputPort<mixed> {
        return this.outputs.get(name);
    }

    findParameter(name: string): ?Parameter<mixed> {
        var port = this.inputs.get(name);
        if (port instanceof Parameter) {
            return port;
        } else {
            return undefined;
        }
    }

    findPort(name: string): ?Port<mixed> {
        var port = this.inputs.get(name);
        if (port != null) {
            return port;
        } else {
            return this.outputs.get(name);
        }
    }

    /**
     * Return an array containing all the ports/parameters of this actor.
     */
    getAll(): Array<mixed> {
        return Array.from(this.inputs.values()).concat(Array.from(this.outputs.values()));
    }

    /**
     * Return an array containing all the input ports of this actor,
     * including parameters that are updateable.
     */
    getInputs(): Array<InputPort<mixed>> {
        return Array.from(this.inputs.values()).filter(
            port => (!(port instanceof Parameter) || port.update === true));
    }

    /**
     * Return an array containing all the output ports of this actor.
     */
    getOutputs(): Array<OutputPort<mixed>> {
        return Array.from(this.outputs.values());
    }

    /**
     * Return an array containing all the parameters of this actor,
     * including ones that are updateable.
     */
    getParameters(): Array<Parameter<mixed>> {
        var parms: Array<Parameter<mixed>> = [];
        for (var port in this.inputs.values()) {
            if (port instanceof Parameter)
                parms.push(port);
        }
        return parms;
        // NOTE: flow can't hack this:
        // return (Array.from(this.inputs.values()).filter(port => (port instanceof Parameter)): Array<Parameter<mixed>>);
    }

    has(element: Port<any>): boolean {
        if (this.findPort(element.name) != null) {
            return true;
        }
        return false;
    }

    /**
     * Remove a port by name, do nothing if the port does not exist.
     */
    remove(element: Port<mixed>): void {
        this.inputs.delete(element.name) && this.outputs.delete(element.name);
    }

    /**
     * Substitute an existing port.
     * @todo: Make sure that the substitution is safe.
     */
    substitute(port: Port<mixed>) {
        var current = this.findPort(port.name);
        if (current == null) {
            this.add(port);
        } else {
            // FIXME: do some checks
            this.remove(current);
            this.add(port);
        }
    }
}

export class Relation<T> implements Containable<Composite> {

    /* Anything sent from src to dst goes through this buffer. */
    buffer: Array<T>;
    from: Port<T>; // FIXME: rename to "src"
    to: Port<T>;   // FIXME: rename to "dst"
    parent: ?Composite;
    name: string;

    constructor(from: Port<T>, to:Port<T>, name: string) {
        this.buffer = [];
        this.from = from;
        this.to = to;
        this.name = name;
        (this:Containable<Composite>);
    }

    getFullyQualifiedName(): string {
        var prefix = "";
        if (this.parent != null) {
            prefix = this.parent.getFullyQualifiedName();
        }
        if (prefix != "") {
            return prefix + "." + this.name;
        } else {
            return this.name;
        }
    }
}

/**
 * A composite is a container for other components, ports, and relations.
 */
export class Composite extends Actor implements
Container<Component|Port<any>|Relation<any>> {

    director: ?Director;
    components: Map<string, Component>;
    ports: Map<string, Component>;
    relsBySource: Map<string, Array<Relation<mixed>>>;
    relsBySink: Map<string, Array<Relation<mixed>>>;
    status: ExecutionStatus;

    constructor(name: string, parent?: ?Composite) {
        super(name, parent);
        this.components = new Map();
        this.relsBySink = new Map();
        this.relsBySource = new Map();

        (this: Executable);
        (this: Container<Component|Port<mixed>|Relation<mixed>>);
    }


    initialize():void {
        if (this.parent == null && this.director == null) {
            throw "Top-level container must have a director.";
        }
    }

    /**
     * Add a component to this composite. Return true if successful, false otherwise.
     */
    add(obj: Component|Port<any>|Relation<any>): boolean {
        // components
        if (obj instanceof Component) {
            if (this.components.get(obj.name) != null) {
                return false;
            } else {
                // unlink
                if (obj.parent != null) {
                    obj.parent.remove(obj);
                }
                this.components.set(obj.name, obj);
                obj.parent = this;
                return true;
            }
        }
        // ports or parameters
        if (obj instanceof InputPort || obj instanceof OutputPort) {
            return super.add(obj);
        }
        // relations
        if (obj instanceof Relation) {
            if (this.has(obj)) {
                return false;
            } else {
                // unlink
                if (obj.parent != null) {
                    obj.parent.remove(obj);
                }
                this.relMap(obj.from.name, obj, this.relsBySource);
                this.relMap(obj.to.name, obj, this.relsBySink);
                obj.parent = this;
            }
            return true;
        }
        return false;
    }

    relMap(key: string, obj: Relation<mixed>, map: Map<string, Array<Relation<mixed>>>) {
        var r = map.get(key);
        if (Array.isArray(r)) {
            r.push(obj);
        } else {
            map.set(key, [obj]);
        }
    }

    find(name: string, namespace: Namespace): mixed {
        var result;

        if (namespace == "components") {
            result = this.findComponent(name);
        }
        else if (namespace == "ports") {
            result = super.find(name, "ports");
        }
        else if (namespace == "relations") {
            result = this.findRelation(name);
        }
        return result;
    }

    findComponent(name: string): ?Component {
        return this.components.get(name);
    }

    findRelation(name: string): ?Relation<mixed> {
        for (var rels of this.relsBySource.values()) {
            for (var rel of rels) {
                if (rel.name == name) {
                    return rel;
                }
            }
        }
    }

    /**
     * Find the relations emenating from the given source port.
     */
    fanOut(source: string): ?Array<Relation<mixed>> {
        return this.relsBySource.get(source);
    }

    /**
     * Find the relations merging into the given sink port.
     */
    fanIn(sink: string): ?Array<Relation<mixed>> {
        return this.relsBySink.get(sink);
    }


    getAll(): Array<mixed> {
        var all = [].concat.apply([], Array.from(this.inputs.values()), 
            Array.from(this.outputs.values()), Array.from(this.components.values()));
        this.relsBySource.forEach(function(val) { all.concat(val) });
        return all;
    }

    /**
     * Remove a containable identified by its name (string).
     * @todo: handle the removal of port and relations.
     */
    remove(element: Component|Port<mixed>|Relation<mixed>) {
        let component = this.components.get(element.name);
        if (component != undefined) {
            component.parent == null;
        }
        this.components.delete(element.name);
        //FIXME: handle port and relations!
    }

    /**
     * Add an element to this container. If a component with the same name
     * already exists, replace it, and reconnect dangling wires to the new
     * component in the same configuration as they were attached to the replaced
     * component, to the extent possible. Wires formerly connected to a port
     * that is not available on the replacement component will be removed.
     * @todo: implement this
     */
    substitute(obj: Component|Port<mixed>|Relation<mixed>) {
        if (obj instanceof InputPort || obj instanceof OutputPort) {
            super.substitute(obj);
        }
        // add the component
        // FIXME
        // reconnect wires
    }

    /**
     * Return true if this container has its own director, false otherwise.
     */
    isOpaque(): boolean {
        return this.director != null;
    }

    /**
     * If this container is opaque, then return its director.
     * Otherwise, search up the containment hierarchy to find
     * the nearest director and return that.
     */
    getDirector(): Director {
        if (this.director != null) {
            return this.director;
        } else {
            return parent.getDirector();
        }
    }

    /**
     * Return whether or not this container has the argument element.
     */
    has(element: Component|Port<any>|Relation<any>): boolean {
        if (element instanceof Component && this.find(element.name, "components") != null) {
            return true;
        }
        if ((element instanceof InputPort || element instanceof OutputPort) && this.find(element.name, "ports") != null) {
            return true;
        }
        if (element instanceof Relation && this.findRelation(element.name) != null) {
            return true;
        }
        return false;
    }
}
