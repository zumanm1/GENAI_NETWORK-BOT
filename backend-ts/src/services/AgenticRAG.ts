import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { AIAgentSystem } from "./AIAgentSystem";
import { MemoryManager } from "./MemoryManager";
import { Document, QueryResult } from "../types";

export class AgenticRAG {
  private documents: Map<string, Document> = new Map();
  private vectorStore: SimpleVectorStore = new SimpleVectorStore();
  private aiAgentSystem: AIAgentSystem;
  private memoryManager: MemoryManager;

  constructor(aiAgentSystem: AIAgentSystem, memoryManager: MemoryManager) {
    this.aiAgentSystem = aiAgentSystem;
    this.memoryManager = memoryManager;
    logger.info("Agentic RAG System initialized");
  }

  public async addDocument(
    document: Omit<Document, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const newDocument: Document = {
      id,
      title: document.title,
      content: document.content,
      metadata: document.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(id, newDocument);

    // Store in vector database for semantic search
    await this.vectorStore.addDocument(id, {
      text: `${document.title} ${document.content}`,
      metadata: document.metadata || {},
    });

    logger.info(`Document added to RAG system: ${id} - ${document.title}`);
    return id;
  }

  public async updateDocument(
    id: string,
    updates: Partial<Pick<Document, "title" | "content" | "metadata">>,
  ): Promise<boolean> {
    const document = this.documents.get(id);
    if (!document) return false;

    const updatedDocument: Document = {
      ...document,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.documents.set(id, updatedDocument);

    // Update in vector database
    await this.vectorStore.updateDocument(id, {
      text: `${updatedDocument.title} ${updatedDocument.content}`,
      metadata: updatedDocument.metadata || {},
    });

    logger.info(`Document updated in RAG system: ${id}`);
    return true;
  }

  public async deleteDocument(id: string): Promise<boolean> {
    if (!this.documents.has(id)) return false;

    this.documents.delete(id);
    await this.vectorStore.deleteDocument(id);

    logger.info(`Document deleted from RAG system: ${id}`);
    return true;
  }

  public getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  public async queryDocuments(
    query: string,
    filter?: { metadata?: Record<string, any> },
    limit: number = 5,
  ): Promise<QueryResult> {
    try {
      // Search for relevant documents
      const relevantDocIds = await this.vectorStore.search(
        query,
        limit,
        filter?.metadata,
      );
      const documents: Document[] = [];

      for (const id of relevantDocIds) {
        const doc = this.documents.get(id);
        if (doc) {
          documents.push(doc);
        }
      }

      logger.info(
        `RAG query executed: "${query}" - Found ${documents.length} documents`,
      );

      return {
        query,
        documents,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error querying RAG system: ${error}`);
      return {
        query,
        documents: [],
        error: String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async agenticQuery(
    query: string,
    context?: string,
    filter?: { metadata?: Record<string, any> },
  ): Promise<{
    answer: string;
    sources: Document[];
    error?: string;
  }> {
    try {
      // Step 1: Retrieve relevant documents
      const queryResult = await this.queryDocuments(query, filter);

      if (queryResult.documents.length === 0) {
        return {
          answer:
            "I couldn't find any relevant information to answer your query.",
          sources: [],
        };
      }

      // Step 2: Create a context from the documents
      let contextText = "";
      queryResult.documents.forEach((doc, index) => {
        contextText += `Source ${index + 1}: ${doc.title}\n${doc.content}\n\n`;
      });

      // Step 3: Use AI agent to generate an answer
      const taskInput = JSON.stringify({
        query,
        context: contextText,
        userContext: context || "",
      });

      const task = await this.aiAgentSystem.createTask("configuration", {
        input: taskInput,
        priority: 4,
      });

      const result = await this.aiAgentSystem.executeTask(task.id);

      if (result.status !== "completed" || !result.output) {
        throw new Error("Failed to generate answer");
      }

      // Step 4: Store the interaction in memory
      await this.memoryManager.storeMemory("rag-system", {
        input: query,
        output: result.output,
        timestamp: new Date().toISOString(),
        metadata: {
          sources: queryResult.documents.map((doc) => doc.id),
          context: context || undefined,
        },
      });

      return {
        answer: result.output,
        sources: queryResult.documents,
      };
    } catch (error) {
      logger.error(`Error in agentic query: ${error}`);
      return {
        answer: "An error occurred while processing your query.",
        sources: [],
        error: String(error),
      };
    }
  }

  public getAllDocuments(filter?: {
    metadata?: Record<string, any>;
  }): Document[] {
    let documents = Array.from(this.documents.values());

    if (filter?.metadata) {
      documents = documents.filter((doc) => {
        for (const [key, value] of Object.entries(filter.metadata!)) {
          if (doc.metadata[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    return documents;
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

  public async updateDocument(
    id: string,
    document: { text: string; metadata: any },
  ): Promise<void> {
    this.documents.set(id, document);
  }

  public async search(
    query: string,
    limit: number = 5,
    filterMetadata?: Record<string, any>,
  ): Promise<string[]> {
    // This is a very simple keyword-based search
    // In a real implementation, this would use embeddings and vector similarity
    const results: { id: string; score: number }[] = [];

    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const [id, doc] of this.documents.entries()) {
      // Apply metadata filter if provided
      if (filterMetadata) {
        let matchesFilter = true;
        for (const [key, value] of Object.entries(filterMetadata)) {
          if (doc.metadata[key] !== value) {
            matchesFilter = false;
            break;
          }
        }
        if (!matchesFilter) continue;
      }

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
