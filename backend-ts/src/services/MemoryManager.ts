import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { AgentMemoryEntry, AgentMemory } from "../types";

export class MemoryManager {
  private memories: Map<string, AgentMemory> = new Map();
  private vectorStore: SimpleVectorStore = new SimpleVectorStore();

  constructor() {
    logger.info("Memory Manager initialized");
  }

  public async storeMemory(
    agentId: string,
    entry: Omit<AgentMemoryEntry, "id">,
  ): Promise<string> {
    // Create memory entry
    const memoryEntry: AgentMemoryEntry = {
      id: uuidv4(),
      ...entry,
    };

    // Get or initialize agent memory
    if (!this.memories.has(agentId)) {
      this.memories.set(agentId, {
        shortTerm: [],
        longTerm: [],
      });
    }

    const agentMemory = this.memories.get(agentId)!;

    // Add to short-term memory (limited to 10 entries)
    agentMemory.shortTerm.unshift(memoryEntry);
    if (agentMemory.shortTerm.length > 10) {
      // Move oldest short-term memory to long-term memory
      const oldestMemory = agentMemory.shortTerm.pop();
      if (oldestMemory) {
        agentMemory.longTerm.push(oldestMemory);
      }
    }

    // Store in vector database for semantic search
    await this.vectorStore.addDocument(memoryEntry.id, {
      text: `${memoryEntry.input} ${memoryEntry.output}`,
      metadata: {
        agentId,
        timestamp: memoryEntry.timestamp,
        ...memoryEntry.metadata,
      },
    });

    logger.debug(`Memory stored for agent ${agentId}: ${memoryEntry.id}`);
    return memoryEntry.id;
  }

  public async retrieveMemories(
    agentId: string,
    query: string,
    limit: number = 5,
  ): Promise<AgentMemoryEntry[]> {
    // First, get all short-term memories
    const agentMemory = this.memories.get(agentId) || {
      shortTerm: [],
      longTerm: [],
    };
    const shortTermMemories = [...agentMemory.shortTerm];

    // Then, search for relevant long-term memories
    const relevantDocIds = await this.vectorStore.search(query, limit);
    const longTermMemories: AgentMemoryEntry[] = [];

    // Get the actual memory entries from the IDs
    for (const docId of relevantDocIds) {
      const memory = agentMemory.longTerm.find((m) => m.id === docId);
      if (memory) {
        longTermMemories.push(memory);
      }
    }

    // Combine short-term and relevant long-term memories
    const combinedMemories = [...shortTermMemories, ...longTermMemories];

    // Sort by timestamp (newest first)
    combinedMemories.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit to requested number
    return combinedMemories.slice(0, limit);
  }

  public getAgentMemory(agentId: string): AgentMemory | undefined {
    return this.memories.get(agentId);
  }

  public clearShortTermMemory(agentId: string): void {
    const agentMemory = this.memories.get(agentId);
    if (agentMemory) {
      agentMemory.shortTerm = [];
      logger.info(`Short-term memory cleared for agent ${agentId}`);
    }
  }

  public async consolidateMemories(agentId: string): Promise<void> {
    const agentMemory = this.memories.get(agentId);
    if (!agentMemory) return;

    // Move all short-term memories to long-term
    agentMemory.longTerm = [...agentMemory.shortTerm, ...agentMemory.longTerm];
    agentMemory.shortTerm = [];

    logger.info(`Memories consolidated for agent ${agentId}`);
  }
}

/**
 * A simple vector store implementation for semantic search.
 * In a production environment, this would be replaced with a proper vector database
 * like Pinecone, Weaviate, or Milvus.
 */
class SimpleVectorStore {
  private documents: Map<string, { text: string; metadata: any }> = new Map();

  public async addDocument(
    id: string,
    document: { text: string; metadata: any },
  ): Promise<void> {
    this.documents.set(id, document);
  }

  public async search(query: string, limit: number = 5): Promise<string[]> {
    // This is a very simple keyword-based search
    // In a real implementation, this would use embeddings and vector similarity
    const results: { id: string; score: number }[] = [];

    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const [id, doc] of this.documents.entries()) {
      const text = doc.text.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        if (text.includes(term)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push({ id, score });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Return the IDs of the top results
    return results.slice(0, limit).map((result) => result.id);
  }

  public async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  public async clear(): Promise<void> {
    this.documents.clear();
  }
}
