import { Graph, ImpactReport, DependencyEdge } from "../types/index.js";
import { reverseReachableFrom } from "../graph/graphAlgorithms.js";

/**
 * Predicts the impact of deleting a specific file by checking reverse reachability.
 */
export function simulateDeletion(graph: Graph, target: string): ImpactReport {
  const reverseReachable = reverseReachableFrom(graph, [target]);
  
  // Exclude target itself from affected lists
  const allAffected = Array.from(reverseReachable).filter(id => id !== target);
  const directlyAffected = graph.incomingTo(target);

  return {
    target,
    directlyAffected,
    allAffected,
    isSafeToDelete: allAffected.length === 0,
  };
}

/**
 * Identifies all edges that would break if a folder path were changed.
 */
export function simulateFolderRename(
  graph: Graph, 
  oldFolderPath: string, 
  newFolderPath: string
): { affectedEdges: DependencyEdge[] } {
  const affectedEdges = graph.edges.filter((edge: DependencyEdge) => 
    edge.to.startsWith(oldFolderPath)
  );

  return { affectedEdges };
}