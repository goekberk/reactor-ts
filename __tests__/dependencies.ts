import {PrecedenceGraph, PrecedenceGraphNode, PrioritySetNode, PrioritySet, Log} from '../src/core/util';
import {Reactor, Reaction, Priority, App} from '../src/core/reactor';

Log.setLevel(Log.levels.DEBUG);

class X<T> extends Reaction<T> {
    
    public react(...args: any[]): void {
        throw new Error("Method not implemented.");
    }

}

class R extends Reactor {
    public nodes: Array<X<unknown>> = [];
    constructor(parent: Reactor|null) {
        super(parent);
        for (let i = 0; i < 7; i++) {
            let r = new X(this, [], []);
            this.nodes.push(r);
            this.addReaction(r);
        }
    }

    getNodes() {
        return this.nodes;
    }
}

describe('Precedence Graph', () => {

    var graph: PrecedenceGraph<PrecedenceGraphNode<Priority>> = new PrecedenceGraph();
    var reactor = new R(new App());

    var nodes = reactor.getNodes();


    graph.addEdge(nodes[3], nodes[5]);
    graph.addEdge(nodes[4], nodes[3]);
    graph.addEdge(nodes[2], nodes[3]);
    graph.addEdge(nodes[1], nodes[2]);
    graph.addEdge(nodes[1], nodes[4]);
    graph.addEdge(nodes[0], nodes[1]);
    graph.addEdge(nodes[0], nodes[4]);


    it('reaction equality',  () => {
        expect(Object.is(nodes[0], nodes[1])).toBeFalsy();
    });

    it('initial graph',  () => {
        expect(graph.size()[0]).toEqual(6); // V
        expect(graph.size()[1]).toEqual(7); // E
        expect(graph.toString()).toBe(
`digraph G {
"R[5]"->"R[3]"->"R[4]"->"R[1]"->"R[0]";
"R[4]"->"R[0]";
"R[3]"->"R[2]"->"R[1]"->"R[0]";
}`);
    });

    it('initial priorities', () => {
        graph.updatePriorities();
        expect(nodes[5].getPriority()).toEqual(0);
        expect(nodes[3].getPriority()).toEqual(100);
        expect(nodes[4].getPriority()).toEqual(200);
        expect(nodes[2].getPriority()).toEqual(300);
        expect(nodes[1].getPriority()).toEqual(400);
        expect(nodes[0].getPriority()).toEqual(500);
    });

    it('remove dependency 4 -> 5', () => {
        graph.removeEdge(nodes[4], nodes[3]);
        expect(graph.size()[0]).toEqual(6); // V
        expect(graph.size()[1]).toEqual(6); // E
        expect(graph.toString()).toBe(
`digraph G {
"R[5]"->"R[3]"->"R[2]"->"R[1]"->"R[0]";
"R[4]"->"R[1]"->"R[0]";
"R[4]"->"R[0]";
}`);
    });

    it('remove node 2', () => {
        graph.removeNode(nodes[1]);
        expect(graph.size()[0]).toEqual(5); // V
        expect(graph.size()[1]).toEqual(3); // E
        Log.debug(graph.toString());
        expect(graph.toString()).toBe(
`digraph G {
"R[5]"->"R[3]"->"R[2]";
"R[4]"->"R[0]";
}`);
    });

    it('add node 7, make 3 dependent on it', () => {
        graph.addNode(nodes[6]);
        graph.addEdges(nodes[2], new Set([nodes[6], nodes[3]]));
        expect(graph.size()[0]).toEqual(6); // V
        expect(graph.size()[1]).toEqual(4); // E
        Log.debug(graph.toString());
        expect(graph.toString()).toBe(
`digraph G {
"R[5]"->"R[3]"->"R[2]";
"R[4]"->"R[0]";
"R[6]"->"R[2]";
}`);
    });

    it('reassign priorities', () => {
        graph.updatePriorities();
        
        expect(nodes[5].getPriority()).toEqual(0);
        expect(nodes[4].getPriority()).toEqual(100);
        expect(nodes[6].getPriority()).toEqual(200);
        expect(nodes[3].getPriority()).toEqual(300);
        expect(nodes[0].getPriority()).toEqual(400);
        expect(nodes[2].getPriority()).toEqual(500);

    });

    it('introduce a cycle', () => {
        graph.addEdge(nodes[5], nodes[2]);
        expect(graph.updatePriorities()).toBeFalsy();
        Log.debug(graph.toString());
    });

});

describe('ReactionQ', () => {
    
    var graph:PrecedenceGraph<Reaction<unknown>> = new PrecedenceGraph();
    var reactor = new R(new App());

    var nodes = reactor.getNodes();

    graph.addEdge(nodes[3], nodes[5]);
    graph.addEdge(nodes[4], nodes[3]);
    graph.addEdge(nodes[2], nodes[3]);
    graph.addEdge(nodes[1], nodes[2]);
    graph.addEdge(nodes[1], nodes[4]);
    graph.addEdge(nodes[0], nodes[1]);
    graph.addEdge(nodes[0], nodes[4]);
    graph.updatePriorities();
    
    var reactionQ = new PrioritySet<Priority>();
    
    for (let i = 0; i < 6; i++) {
        Log.debug("Pushing node: " + i + " with prio: " + nodes[i].getPriority());
        reactionQ.push(nodes[i]);
    }
    
    // duplicate insertions
    Log.debug("Pushing duplicate node with prio: " + nodes[5].getPriority());
    reactionQ.push(nodes[5]);
    Log.debug("Pushing duplicate node with prio: " + nodes[1].getPriority());
    reactionQ.push(nodes[1]);

    it('first pop', () => {
        // expect(reactionQ.pop()).toEqual({_id: 6, _next: null, _priority: 0});
        let r = reactionQ.pop();
        for (let i = 0; i < 6; i++) {
            if (Object.is(r, nodes[i])) {
                Log.debug("Found matching node: " + i + " with prio: " + nodes[i].getPriority());
            }
        }
        expect(Object.is(r, nodes[5])).toBe(true);
        if (r)
            expect(r.getPriority()).toEqual(0);
    });

    it('second pop', () => {
        // expect(reactionQ.pop()).toEqual({_id: 4, _next: null, _priority: 100});
        let r = reactionQ.pop();
        
        for (let i = 0; i < 6; i++) {
            if (Object.is(r, nodes[i])) {
                Log.debug("Found matching node: " + i + " with prio: " + nodes[i].getPriority());
            }
        }
        expect(Object.is(r, nodes[3])).toBe(true);
        if (r)
            expect(r.getPriority()).toEqual(100);
    });

    it('third pop', () => {
        //expect(reactionQ.pop()).toEqual({_id: 5, _next: null, _priority: 200});
        let r = reactionQ.pop();
        for (let i = 0; i < 6; i++) {
            if (Object.is(r, nodes[i])) {
                Log.debug("Found matching node: " + i + " with prio: " + nodes[i].getPriority());
            }
        }
        expect(Object.is(r, nodes[4])).toBe(true);
        if (r)
            expect(r.getPriority()).toEqual(200);
    });

    it('fourth pop', () => {
        //expect(reactionQ.pop()).toEqual({_id: 3, _next: null, _priority: 300});
        let r = reactionQ.pop();
        for (let i = 0; i < 6; i++) {
            if (Object.is(r, nodes[i])) {
                Log.debug("Found matching node: " + i + " with prio: " + nodes[i].getPriority());
            }
        }
        expect(Object.is(r, nodes[2])).toBe(true);
        if (r)
            expect(r.getPriority()).toEqual(300);

    });

    it('fifth pop', () => {
        // expect(reactionQ.pop()).toEqual({_id: 2, _next: null, _priority: 400});
        let r = reactionQ.pop();
        for (let i = 0; i < 6; i++) {
            if (Object.is(r, nodes[i])) {
                Log.debug("Found matching node: " + i + " with prio: " + nodes[i].getPriority());
            }
        }
        expect(Object.is(r, nodes[1])).toBe(true);
        if (r)
            expect(r.getPriority()).toEqual(400);

    });
    
    it('sixth pop', () => {
        //expect(reactionQ.pop()).toEqual({_id: 1, _next: null, _priority: 500});
        let r = reactionQ.pop();
        for (let i = 0; i < 6; i++) {
            if (Object.is(r, nodes[i])) {
                Log.debug("Found matching node: " + i + " with prio: " + nodes[i].getPriority());
            }
        }
        expect(Object.is(r, nodes[0])).toBe(true);
        if (r)
            expect(r.getPriority()).toEqual(500);
    });

    it('seventh pop', () => {
        let r = reactionQ.pop();
        expect(r).toBeUndefined();
    });

});