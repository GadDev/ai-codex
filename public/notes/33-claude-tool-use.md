---
title: Claude Tool Use (Function Calling)
tags: [tool-use, function-calling, agents, parallel-tools, tool-loop]
source: Anthropic docs
---

# Claude Tool Use (Function Calling) 🔧

Tools let Claude take actions and retrieve live data — the bridge between language and the real world.

---

## How It Works

The tool-use loop has four steps:

```
1. You send a request + tool definitions
2. Claude returns a tool_use block (name + inputs)
3. You execute the tool and get a result
4. You send the result back → Claude gives the final answer
```

```python
import anthropic

client = anthropic.Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a city.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g. 'Paris'"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"], "default": "celsius"}
            },
            "required": ["city"]
        }
    }
]

# Step 1 — send request with tools
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather like in Lyon?"}]
)

# Step 2 — Claude may return a tool_use block
if response.stop_reason == "tool_use":
    tool_call = next(b for b in response.content if b.type == "tool_use")
    city = tool_call.input["city"]

    # Step 3 — execute the real tool
    weather_data = call_weather_api(city)

    # Step 4 — send result back
    final = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        tools=tools,
        messages=[
            {"role": "user", "content": "What's the weather like in Lyon?"},
            {"role": "assistant", "content": response.content},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": tool_call.id, "content": str(weather_data)}
            ]}
        ]
    )
    print(final.content[0].text)
```

---

## Parallel Tool Use

Claude can call multiple tools in a single response — handle all before replying.

```python
tool_calls = [b for b in response.content if b.type == "tool_use"]

results = []
for call in tool_calls:
    result = dispatch_tool(call.name, call.input)
    results.append({
        "type": "tool_result",
        "tool_use_id": call.id,
        "content": str(result)
    })
```

---

## Tool Design Best Practices

- **One responsibility per tool** — `search_docs` not `do_everything`
- **Rich descriptions** — Claude picks tools based on description, not name
- **Enumerate valid values** — use `enum` instead of free-text where possible
- **Return structured data** — JSON strings are easier for Claude to parse than prose
- **Validate inputs** — Claude can hallucinate argument values; always validate before executing

---

## `tool_choice` — Controlling When Tools Are Used

```python
tool_choice={"type": "tool", "name": "get_weather"}  # force a specific tool
tool_choice={"type": "auto"}   # let Claude decide (default)
tool_choice={"type": "none"}   # no tools, even if defined
```

---

## Error Handling

```python
try:
    result = execute_tool(tool_call.name, tool_call.input)
    content = json.dumps(result)
    is_error = False
except Exception as e:
    content = f"Tool execution failed: {str(e)}"
    is_error = True

tool_result = {
    "type": "tool_result",
    "tool_use_id": tool_call.id,
    "content": content,
    "is_error": is_error
}
```

---

## Further Reading

- Anthropic tool use guide: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- Cookbook examples: https://github.com/anthropics/anthropic-cookbook/tree/main/tool_use
