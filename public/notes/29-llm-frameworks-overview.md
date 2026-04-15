---
title: LLM Frameworks Overview
tags: [LangChain, LlamaIndex, LangGraph, PydanticAI, CrewAI, DSPy, frameworks]
source: Course notes + official docs
---

# LLM Frameworks Overview

A map of the ecosystem — what each framework does, when it helps, and when it gets in the way.

---

## The Core Trade-off

Frameworks trade **flexibility for convenience**. For a quick prototype, they save hours. For a production system with unusual requirements, they add opaque abstractions that are hard to debug.

**Rule of thumb**: start with the Anthropic SDK directly. Add a framework when you're solving a problem it was built for.

---

## LangChain — The Swiss Army Knife

**What**: Chains + agents + tool use + memory + dozens of integrations.
**Best for**: Rapid prototyping, connecting many external services, tutorials.
**Watch out**: Heavy abstractions, breaking changes between versions, hard to debug.

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

llm = ChatAnthropic(model="claude-sonnet-4-6")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{input}")
])
chain = prompt | llm
response = chain.invoke({"input": "What is RAG?"})
```

---

## LlamaIndex — The RAG Specialist

**What**: Data ingestion, chunking, embedding, vector storage, and retrieval pipelines — all batteries included.
**Best for**: Building RAG over your own documents with minimal boilerplate.
**Watch out**: Over-engineered for simple use cases; Chroma + Voyage AI directly is often simpler.

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

documents = SimpleDirectoryReader("./docs").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("Summarise the key points about billing")
print(response)
```

---

## LangGraph — Stateful Multi-Step Agents

**What**: Graph-based framework for agents with branching, loops, and persistent state. Built on top of LangChain.
**Best for**: Complex agentic workflows — human-in-the-loop, parallel branches, long-running tasks with checkpointing.
**Watch out**: Steep learning curve; overkill for linear chains.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    next_step: str

def research_node(state):
    # Call tools, update state
    return {"next_step": "write"}

graph = StateGraph(AgentState)
graph.add_node("research", research_node)
graph.add_edge("research", END)
app = graph.compile()
```

---

## Pydantic AI — Type-Safe Agents

**What**: Agent framework built on Pydantic v2 — structured inputs/outputs, validation, dependency injection.
**Best for**: Production APIs where you need guaranteed structured JSON from LLMs.
**Watch out**: Younger ecosystem, fewer integrations than LangChain.

```python
from pydantic import BaseModel
from pydantic_ai import Agent

class UserInfo(BaseModel):
    name: str
    age: int
    interests: list[str]

agent = Agent("claude-sonnet-4-6", result_type=UserInfo)
result = agent.run_sync("Extract: Alice is 28 and loves hiking and photography.")
print(result.data)  # UserInfo(name='Alice', age=28, interests=['hiking', 'photography'])
```

---

## CrewAI — Multi-Agent Teams

**What**: Orchestrate multiple specialised agents as a "crew" — each with a role, goal, and tools.
**Best for**: Workflows that benefit from role separation (researcher + writer + reviewer pattern).
**Watch out**: Coordination overhead; often simpler to use a single agent with tools.

```python
from crewai import Agent, Task, Crew

researcher = Agent(role="Researcher", goal="Find accurate information", llm="claude-sonnet-4-6")
writer = Agent(role="Writer", goal="Write clear summaries", llm="claude-sonnet-4-6")

task1 = Task(description="Research the latest trends in AI safety", agent=researcher)
task2 = Task(description="Write a 200-word summary of the research", agent=writer)

crew = Crew(agents=[researcher, writer], tasks=[task1, task2])
result = crew.kickoff()
```

---

## DSPy — Prompt Optimisation

**What**: Treats prompts as learnable parameters — automatically optimises few-shot examples and instructions using your eval set.
**Best for**: When you have a clear metric (accuracy, F1) and want the framework to find the best prompt automatically.
**Watch out**: Requires a good eval set; optimisation takes time; less intuitive than hand-crafted prompts.

```python
import dspy

class QASignature(dspy.Signature):
    """Answer questions with short factual responses."""
    question = dspy.InputField()
    answer = dspy.OutputField()

qa = dspy.ChainOfThought(QASignature)

# Compile (optimise) against your training data
optimizer = dspy.BootstrapFewShot(metric=your_metric)
compiled_qa = optimizer.compile(qa, trainset=train_data)
```

---

## Decision Guide

| I want to... | Use |
|---|---|
| Prototype quickly with many integrations | LangChain |
| Build a RAG pipeline over my docs | LlamaIndex |
| Orchestrate a complex multi-step agent with state | LangGraph |
| Guarantee structured JSON output from LLMs | Pydantic AI |
| Simulate a team of specialised agents | CrewAI |
| Auto-optimise prompts with a metric | DSPy |
| Build something custom and maintainable | Raw Anthropic SDK |

---

## Further Reading

- LangChain: https://python.langchain.com/docs/introduction/
- LlamaIndex: https://docs.llamaindex.ai
- LangGraph: https://langchain-ai.github.io/langgraph/
- Pydantic AI: https://ai.pydantic.dev
- CrewAI: https://docs.crewai.com
- DSPy: https://dspy.ai
