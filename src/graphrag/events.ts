/**
 * Event types emitted by GraphRAGEngine for real-time monitoring
 * Story 6.1: Real-time Events Stream (SSE)
 */

export interface GraphSyncedEvent {
  type: "graph_synced";
  data: {
    node_count: number;
    edge_count: number;
    sync_duration_ms: number;
    timestamp: string;
  };
}

export interface EdgeCreatedEvent {
  type: "edge_created";
  data: {
    from_tool_id: string;
    to_tool_id: string;
    confidence_score: number;
    timestamp: string;
  };
}

export interface EdgeUpdatedEvent {
  type: "edge_updated";
  data: {
    from_tool_id: string;
    to_tool_id: string;
    old_confidence: number;
    new_confidence: number;
    observed_count: number;
    timestamp: string;
  };
}

export interface WorkflowExecutedEvent {
  type: "workflow_executed";
  data: {
    workflow_id: string;
    tool_ids: string[];
    success: boolean;
    execution_time_ms: number;
    timestamp: string;
  };
}

export interface MetricsUpdatedEvent {
  type: "metrics_updated";
  data: {
    edge_count: number;
    node_count: number;
    density: number;
    pagerank_top_10: Array<{ tool_id: string; score: number }>;
    communities_count: number;
    timestamp: string;
  };
}

export interface HeartbeatEvent {
  type: "heartbeat";
  data: {
    connected_clients: number;
    uptime_seconds: number;
    timestamp: string;
  };
}

/**
 * Union type representing all possible graph events
 */
export type GraphEvent =
  | GraphSyncedEvent
  | EdgeCreatedEvent
  | EdgeUpdatedEvent
  | WorkflowExecutedEvent
  | MetricsUpdatedEvent
  | HeartbeatEvent;
