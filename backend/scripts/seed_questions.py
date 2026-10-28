"""
scripts/seed_questions.py — Populates at least 20 comprehensive questions for each of the 5 assessments.
"""
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.assessment import Assessment, AssessmentQuestion
from models.skill import Skill

ASSESSMENTS_DATA = [
    {
        "title": "Python Fundamentals",
        "skill_name": "Python",
        "difficulty": "intermediate",
        "time_limit_minutes": 15,
        "questions": [
            {
                "q": "What happens when you execute `a = [1, 2]; b = a; b.append(3)` in Python?",
                "opts": [
                    {"id": "a", "text": "a is [1, 2] and b is [1, 2, 3]"},
                    {"id": "b", "text": "Both a and b reference [1, 2, 3]"},
                    {"id": "c", "text": "Python raises an AssignmentError"},
                    {"id": "d", "text": "b becomes a tuple (1, 2, 3)"}
                ],
                "ans": "b",
                "exp": "Lists are mutable objects in Python. The assignment b = a creates a second reference to the same list object in memory, so mutating b also mutates a.",
                "difficulty": "easy",
                "topic": "Variables & Mutability"
            },
            {
                "q": "What is the output of the list comprehension `[x**2 for x in range(5) if x % 2 != 0]`?",
                "opts": [
                    {"id": "a", "text": "[0, 4, 16]"},
                    {"id": "b", "text": "[1, 9]"},
                    {"id": "c", "text": "[1, 4, 9]"},
                    {"id": "d", "text": "[1, 9, 25]"}
                ],
                "ans": "b",
                "exp": "range(5) produces numbers 0, 1, 2, 3, 4. The condition x % 2 != 0 filters for odd numbers (1 and 3). Their squares are 1 and 9.",
                "difficulty": "easy",
                "topic": "List Comprehensions"
            },
            {
                "q": "Why is using a mutable default argument like `def append_item(val, items=[])` considered a bad practice in Python?",
                "opts": [
                    {"id": "a", "text": "It throws a TypeError when executed"},
                    {"id": "b", "text": "Default arguments are evaluated once at function definition time, sharing the same list across invocations"},
                    {"id": "c", "text": "Python automatically casts items to an immutable tuple"},
                    {"id": "d", "text": "It disables garbage collection for the function"}
                ],
                "ans": "b",
                "exp": "Default parameter values are evaluated once when the function is defined, not each time it is called. A mutable default argument retains mutations across subsequent calls unless explicitly re-bound.",
                "difficulty": "medium",
                "topic": "Function Arguments"
            },
            {
                "q": "What is the average time complexity for checking membership (`item in my_set`) in a Python set containing n elements?",
                "opts": [
                    {"id": "a", "text": "O(n)"},
                    {"id": "b", "text": "O(log n)"},
                    {"id": "c", "text": "O(1)"},
                    {"id": "d", "text": "O(n^2)"}
                ],
                "ans": "c",
                "exp": "Python sets are implemented as hash tables. Computing the hash of an object gives average O(1) constant-time lookup, insertion, and deletion.",
                "difficulty": "easy",
                "topic": "Dictionaries & Sets"
            },
            {
                "q": "What is the primary operational advantage of a generator function using `yield` compared to returning a complete list?",
                "opts": [
                    {"id": "a", "text": "Generators execute concurrently across multiple OS threads"},
                    {"id": "b", "text": "Generators evaluate lazily, producing values on-demand to minimize memory consumption"},
                    {"id": "c", "text": "Generators prevent recursion depth errors"},
                    {"id": "d", "text": "Generators guarantee O(1) random index access"}
                ],
                "ans": "b",
                "exp": "Generators yield values one by one on-demand through the iterator protocol rather than computing and storing the entire dataset in RAM simultaneously.",
                "difficulty": "medium",
                "topic": "Generators & Memory"
            },
            {
                "q": "In Python, what is the fundamental difference between the equality operator `==` and the identity operator `is`?",
                "opts": [
                    {"id": "a", "text": "== checks memory address, whereas is checks value equality"},
                    {"id": "b", "text": "== checks value equality (__eq__), whereas is checks whether two variables point to the exact same object in memory"},
                    {"id": "c", "text": "is works exclusively with numeric primitives, while == is for strings"},
                    {"id": "d", "text": "There is no difference; they are interchangeable in Python 3"}
                ],
                "ans": "b",
                "exp": "The == operator evaluates whether the values of two objects are equal by calling __eq__, while 'is' checks object identity (whether id(a) == id(b)).",
                "difficulty": "easy",
                "topic": "Operators & Identity"
            },
            {
                "q": "Which dunder (magic) method is invoked when the built-in function `len(obj)` is called on a custom class?",
                "opts": [
                    {"id": "a", "text": "__size__"},
                    {"id": "b", "text": "__length__"},
                    {"id": "c", "text": "__len__"},
                    {"id": "d", "text": "__count__"}
                ],
                "ans": "c",
                "exp": "Python's len() delegates directly to the object's __len__() method, which must return a non-negative integer.",
                "difficulty": "easy",
                "topic": "OOP & Dunder Methods"
            },
            {
                "q": "In a `try-except-else-finally` construct, under which condition does the `else` block execute?",
                "opts": [
                    {"id": "a", "text": "Only when an exception is raised and handled"},
                    {"id": "b", "text": "Only when no exceptions are raised in the try block"},
                    {"id": "c", "text": "Only if the finally block finishes without returning"},
                    {"id": "d", "text": "It always runs immediately before the finally block regardless of errors"}
                ],
                "ans": "b",
                "exp": "The else block in exception handling executes if and only if the try block completed successfully without raising any exceptions.",
                "difficulty": "medium",
                "topic": "Exceptions"
            },
            {
                "q": "What is the result of applying the slice syntax `s[::-1]` to a string `s = 'Python'`?",
                "opts": [
                    {"id": "a", "text": "'P'"},
                    {"id": "b", "text": "'nohtyP'"},
                    {"id": "c", "text": "'ytho'"},
                    {"id": "d", "text": "Raises a ValueError due to negative step"}
                ],
                "ans": "b",
                "exp": "The slice format [start:stop:step] with a step of -1 steps backwards through the sequence, producing the reversed string 'nohtyP'.",
                "difficulty": "easy",
                "topic": "Strings & Slicing"
            },
            {
                "q": "What does the `nonlocal` keyword do when used inside an inner nested function?",
                "opts": [
                    {"id": "a", "text": "Binds the variable to the module-level global namespace"},
                    {"id": "b", "text": "Binds the variable to the nearest enclosing non-global scope"},
                    {"id": "c", "text": "Creates an immutable constant in the local scope"},
                    {"id": "d", "text": "Allows the variable to be shared across multiple threads"}
                ],
                "ans": "b",
                "exp": "nonlocal causes the identifier to refer to a previously bound variable in the closest enclosing function namespace, excluding the global scope.",
                "difficulty": "medium",
                "topic": "Scope & LEGB"
            },
            {
                "q": "Why can a tuple containing integers be used as a dictionary key, but a list containing integers cannot?",
                "opts": [
                    {"id": "a", "text": "Tuples are immutable and therefore hashable, whereas lists are mutable and unhashable"},
                    {"id": "b", "text": "Lists consume more heap memory than tuples"},
                    {"id": "c", "text": "Dictionaries require keys to have a fixed string representation"},
                    {"id": "d", "text": "Tuples can only store primitive numeric values"}
                ],
                "ans": "a",
                "exp": "Dictionary keys must be hashable so their hash value remains invariant. Because lists can be modified in-place, their hash would change, breaking hash table invariants.",
                "difficulty": "medium",
                "topic": "Tuples vs Lists"
            },
            {
                "q": "What is the primary role of a Python decorator function?",
                "opts": [
                    {"id": "a", "text": "To compile Python bytecode into C extensions"},
                    {"id": "b", "text": "To take a callable as an argument, wrap or modify its behavior, and return a callable"},
                    {"id": "c", "text": "To enforce type hints at compilation time"},
                    {"id": "d", "text": "To serialize objects into JSON format"}
                ],
                "ans": "b",
                "exp": "A decorator is syntactic sugar for passing a function into a higher-order wrapper function and rebinding the name to the modified callable returned.",
                "difficulty": "medium",
                "topic": "Decorators & Functions"
            },
            {
                "q": "In a function signature `def func(*args, **kwargs):`, what Python data structures are `args` and `kwargs` unpacked into?",
                "opts": [
                    {"id": "a", "text": "args is a list, kwargs is a dictionary"},
                    {"id": "b", "text": "args is a tuple, kwargs is a dictionary"},
                    {"id": "c", "text": "args is a tuple, kwargs is a set"},
                    {"id": "d", "text": "args is a list, kwargs is a tuple"}
                ],
                "ans": "b",
                "exp": "*args captures arbitrary positional arguments into an immutable tuple, while **kwargs captures arbitrary keyword arguments into a standard dict.",
                "difficulty": "easy",
                "topic": "Function Arguments"
            },
            {
                "q": "What algorithm does Python use to determine the Method Resolution Order (MRO) in multiple inheritance hierarchies?",
                "opts": [
                    {"id": "a", "text": "Breadth-First Search (BFS)"},
                    {"id": "b", "text": "Depth-First Search (DFS) with backtracking"},
                    {"id": "c", "text": "C3 Linearization algorithm"},
                    {"id": "d", "text": "Dijkstra's shortest path algorithm"}
                ],
                "ans": "c",
                "exp": "Python uses C3 Linearization to compute class MRO, guaranteeing local precedence ordering and monotonicity across complex inheritance structures.",
                "difficulty": "hard",
                "topic": "OOP & MRO"
            },
            {
                "q": "How does `copy.deepcopy()` differ from `copy.copy()` when copying a nested list?",
                "opts": [
                    {"id": "a", "text": "copy.copy() converts nested lists into immutable tuples"},
                    {"id": "b", "text": "copy.copy() shallowly copies the outer container while preserving references to inner objects; deepcopy recursively clones all nested objects"},
                    {"id": "c", "text": "copy.deepcopy() can only be applied to primitive scalar values"},
                    {"id": "d", "text": "There is no difference for lists"}
                ],
                "ans": "b",
                "exp": "A shallow copy creates a new collection but inserts references to the child objects found in the original. A deep copy recursively duplicates every object found.",
                "difficulty": "medium",
                "topic": "Copying & References"
            },
            {
                "q": "Which pair of methods must an object implement to be utilized as a context manager with the `with` statement?",
                "opts": [
                    {"id": "a", "text": "__open__() and __close__()"},
                    {"id": "b", "text": "__start__() and __stop__()"},
                    {"id": "c", "text": "__enter__() and __exit__()"},
                    {"id": "d", "text": "__init__() and __del__()"}
                ],
                "ans": "c",
                "exp": "The context management protocol requires __enter__() (executed before entering the with body) and __exit__() (executed upon leaving or on exception).",
                "difficulty": "easy",
                "topic": "Context Managers"
            },
            {
                "q": "What is the first argument passed to a method decorated with `@classmethod`?",
                "opts": [
                    {"id": "a", "text": "The instance of the class (self)"},
                    {"id": "b", "text": "The class object itself (cls)"},
                    {"id": "c", "text": "The method name as a string"},
                    {"id": "d", "text": "None"}
                ],
                "ans": "b",
                "exp": "A @classmethod receives the class object (typically named cls) as its first implicit parameter rather than an instance of the class.",
                "difficulty": "easy",
                "topic": "OOP & Methods"
            },
            {
                "q": "What is the Global Interpreter Lock (GIL) in CPython?",
                "opts": [
                    {"id": "a", "text": "A mechanism preventing external network connections from modifying Python variables"},
                    {"id": "b", "text": "A mutual exclusion lock that prevents multiple native threads from executing CPython bytecode simultaneously in a single process"},
                    {"id": "c", "text": "A disk encryption tool built into standard library"},
                    {"id": "d", "text": "A garbage collection threshold lock"}
                ],
                "ans": "b",
                "exp": "The GIL is a mutex used by CPython to protect access to Python objects, preventing race conditions in memory management by ensuring only one thread executes bytecode at a time.",
                "difficulty": "hard",
                "topic": "Concurrency & GIL"
            },
            {
                "q": "What is the value of the special variable `__name__` when a script is executed directly via `python script.py`?",
                "opts": [
                    {"id": "a", "text": "'__main__'"},
                    {"id": "b", "text": "'script'"},
                    {"id": "c", "text": "'root'"},
                    {"id": "d", "text": "None"}
                ],
                "ans": "a",
                "exp": "When a Python file is run directly, the runtime assigns '__main__' to its __name__ attribute, allowing boilerplate checks like if __name__ == '__main__':.",
                "difficulty": "easy",
                "topic": "Modules & Execution"
            },
            {
                "q": "What is the value of variable `middle` after unpacking `first, *middle, last = [10, 20, 30, 40, 50]`?",
                "opts": [
                    {"id": "a", "text": "[20, 30, 40]"},
                    {"id": "b", "text": "(20, 30, 40)"},
                    {"id": "c", "text": "30"},
                    {"id": "d", "text": "[20, 30]"}
                ],
                "ans": "a",
                "exp": "Extended sequence unpacking captures remaining intermediate elements into a list. Here first=10, last=50, and middle=[20, 30, 40].",
                "difficulty": "medium",
                "topic": "Unpacking"
            }
        ]
    },
    {
        "title": "JavaScript & React Basics",
        "skill_name": "React",
        "difficulty": "intermediate",
        "time_limit_minutes": 15,
        "questions": [
            {
                "q": "How does hoisting behave for variables declared with `let` and `const` compared to `var`?",
                "opts": [
                    {"id": "a", "text": "They are not hoisted at all and remain at their location in code"},
                    {"id": "b", "text": "They are hoisted to the top of their block scope but reside in a Temporal Dead Zone (TDZ) until evaluated"},
                    {"id": "c", "text": "They are hoisted and immediately initialized to undefined"},
                    {"id": "d", "text": "They are automatically attached to the global window object"}
                ],
                "ans": "b",
                "exp": "let and const are hoisted to the top of their enclosing block, but accessing them before their declaration line throws a ReferenceError due to the Temporal Dead Zone.",
                "difficulty": "medium",
                "topic": "Variables & Scope"
            },
            {
                "q": "What is the result of evaluating `false == ''` versus `false === ''` in JavaScript?",
                "opts": [
                    {"id": "a", "text": "true and true"},
                    {"id": "b", "text": "false and false"},
                    {"id": "c", "text": "true and false"},
                    {"id": "d", "text": "false and true"}
                ],
                "ans": "c",
                "exp": "Loose equality == coerces both false and empty string '' to number 0 (evaluating to true), whereas strict equality === compares both value and distinct types (boolean vs string, evaluating to false).",
                "difficulty": "easy",
                "topic": "Type Coercion & Equality"
            },
            {
                "q": "In the JavaScript event loop, which queue takes precedence when the current call stack clears?",
                "opts": [
                    {"id": "a", "text": "The macrotask queue (e.g., setTimeout, setInterval)"},
                    {"id": "b", "text": "The microtask queue (e.g., Promise callbacks, queueMicrotask)"},
                    {"id": "c", "text": "The UI rendering thread always runs first"},
                    {"id": "d", "text": "Both queues are processed strictly in round-robin order"}
                ],
                "ans": "b",
                "exp": "Microtasks have higher priority: the JavaScript engine completely drains the microtask queue before picking the next callback from the macrotask queue.",
                "difficulty": "hard",
                "topic": "Event Loop"
            },
            {
                "q": "How does the `this` context behave inside an ES6 arrow function?",
                "opts": [
                    {"id": "a", "text": "It binds dynamically to the object that called the function"},
                    {"id": "b", "text": "It is lexically resolved from the enclosing outer execution context"},
                    {"id": "c", "text": "It is always undefined in strict mode"},
                    {"id": "d", "text": "It can be rebound using .bind(), .call(), or .apply()"}
                ],
                "ans": "b",
                "exp": "Arrow functions do not have their own this binding; they inherit this from the surrounding lexical scope at the time they are defined.",
                "difficulty": "medium",
                "topic": "Functions & Closures"
            },
            {
                "q": "Which array method executes a reducer callback over array elements to return a single output without mutating the original array?",
                "opts": [
                    {"id": "a", "text": "forEach()"},
                    {"id": "b", "text": "map()"},
                    {"id": "c", "text": "reduce()"},
                    {"id": "d", "text": "splice()"}
                ],
                "ans": "c",
                "exp": "reduce() iterates through an array applying an accumulator callback, returning a single computed value without altering the input array.",
                "difficulty": "easy",
                "topic": "Arrays & Higher Order Functions"
            },
            {
                "q": "What is the primary purpose of React's Virtual DOM reconciliation process?",
                "opts": [
                    {"id": "a", "text": "To manipulate the browser DOM directly for every single state update"},
                    {"id": "b", "text": "To calculate the minimal set of real DOM mutations needed by diffing lightweight tree representations in memory"},
                    {"id": "c", "text": "To compile JSX into WebAssembly binaries"},
                    {"id": "d", "text": "To eliminate the need for CSS style recalculation"}
                ],
                "ans": "b",
                "exp": "Direct real DOM operations are expensive. React's Virtual DOM diffs tree changes in memory and applies only the batched differences to the real DOM.",
                "difficulty": "easy",
                "topic": "Virtual DOM"
            },
            {
                "q": "When updating state that depends on the previous state in React `useState`, what is the recommended practice?",
                "opts": [
                    {"id": "a", "text": "setCount(count + 1)"},
                    {"id": "b", "text": "setCount(prev => prev + 1)"},
                    {"id": "c", "text": "count = count + 1"},
                    {"id": "d", "text": "useRef(count + 1)"}
                ],
                "ans": "b",
                "exp": "Because React state updates may be asynchronous or batched, providing a functional updater (prev => prev + 1) ensures calculations use the freshest committed state.",
                "difficulty": "easy",
                "topic": "React State"
            },
            {
                "q": "When does the cleanup function returned inside a `useEffect` hook execute?",
                "opts": [
                    {"id": "a", "text": "Only when the user closes or refreshes the browser tab"},
                    {"id": "b", "text": "Immediately before the component unmounts and before re-running the effect on dependency change"},
                    {"id": "c", "text": "Immediately after the initial DOM mount"},
                    {"id": "d", "text": "Only if an uncaught runtime error is thrown"}
                ],
                "ans": "b",
                "exp": "React calls effect cleanup functions to clean up subscriptions or timers before re-running the effect on new dependency values, and upon component unmounting.",
                "difficulty": "medium",
                "topic": "React Hooks"
            },
            {
                "q": "Why is using array index as a `key` prop discouraged when rendering dynamic lists in React?",
                "opts": [
                    {"id": "a", "text": "React throws a fatal compilation error"},
                    {"id": "b", "text": "Reordering, inserting, or deleting items can cause component state to get associated with the wrong elements"},
                    {"id": "c", "text": "It doubles the memory consumption of the Virtual DOM"},
                    {"id": "d", "text": "Indices cannot be converted to strings"}
                ],
                "ans": "b",
                "exp": "Keys provide identity across renders. When items are added, deleted, or reordered, index-based keys remain 0, 1, 2... confusing React's diffing and causing subtle UI state bugs.",
                "difficulty": "medium",
                "topic": "JSX & Keys"
            },
            {
                "q": "What is a closure in JavaScript?",
                "opts": [
                    {"id": "a", "text": "A function that immediately terminates the browser process"},
                    {"id": "b", "text": "A function bundled together with references to its lexical environment, allowing access to outer variables even after the outer function has returned"},
                    {"id": "c", "text": "An HTML tag closing bracket"},
                    {"id": "d", "text": "A method to declare private class variables using #"}
                ],
                "ans": "b",
                "exp": "A closure gives a function access to its outer scope variables even after the outer function has finished execution and popped off the call stack.",
                "difficulty": "medium",
                "topic": "Closures"
            },
            {
                "q": "What is the initial state of a Promise created via `new Promise((resolve, reject) => {})` before either settlement callback is invoked?",
                "opts": [
                    {"id": "a", "text": "'fulfilled'"},
                    {"id": "b", "text": "'resolved'"},
                    {"id": "c", "text": "'pending'"},
                    {"id": "d", "text": "'settled'"}
                ],
                "ans": "c",
                "exp": "A Promise begins in the 'pending' state and transitions permanently to either 'fulfilled' or 'rejected'.",
                "difficulty": "easy",
                "topic": "Promises"
            },
            {
                "q": "What is the fundamental architectural difference between Props and State in React?",
                "opts": [
                    {"id": "a", "text": "Props are mutable and managed locally, while State is read-only and passed down"},
                    {"id": "b", "text": "Props are read-only inputs passed from parent to child, whereas State is internal mutable data managed by the component itself"},
                    {"id": "c", "text": "Props can only contain primitive numbers and strings"},
                    {"id": "d", "text": "Updating props triggers re-render, but updating state never does"}
                ],
                "ans": "b",
                "exp": "Props allow parent components to pass data down the component hierarchy (unidirectional data flow), while state represents internal component data that can trigger re-renders.",
                "difficulty": "easy",
                "topic": "Props vs State"
            },
            {
                "q": "Given `const { name, role = 'developer' } = { name: 'Alex' };`, what are the values of `name` and `role`?",
                "opts": [
                    {"id": "a", "text": "name = 'Alex', role = undefined"},
                    {"id": "b", "text": "name = 'Alex', role = 'developer'"},
                    {"id": "c", "text": "name = 'Alex', role = null"},
                    {"id": "d", "text": "Throws a SyntaxError"}
                ],
                "ans": "b",
                "exp": "ES6 object destructuring allows default fallback values. Since role is undefined in the source object, it receives the default string 'developer'.",
                "difficulty": "easy",
                "topic": "ES6 Destructuring"
            },
            {
                "q": "What is the difference between `event.preventDefault()` and `event.stopPropagation()` in DOM event handling?",
                "opts": [
                    {"id": "a", "text": "preventDefault stops event bubbling; stopPropagation cancels the browser default action"},
                    {"id": "b", "text": "preventDefault cancels the browser default native action (e.g. form submission); stopPropagation stops the event from propagating further in the DOM tree"},
                    {"id": "c", "text": "They are exact synonyms in modern browsers"},
                    {"id": "d", "text": "stopPropagation removes the event listener permanently"}
                ],
                "ans": "b",
                "exp": "preventDefault() prevents standard browser actions like page reload on form submit, whereas stopPropagation() stops the event from bubbling up the DOM hierarchy.",
                "difficulty": "medium",
                "topic": "DOM Events"
            },
            {
                "q": "How does updating `ref.current` from `useRef` differ from calling a state setter from `useState`?",
                "opts": [
                    {"id": "a", "text": "Mutating ref.current does not trigger a component re-render, whereas calling a state setter does"},
                    {"id": "b", "text": "useRef re-renders synchronously while useState re-renders asynchronously"},
                    {"id": "c", "text": "useRef can only store HTML DOM element references"},
                    {"id": "d", "text": "ref.current resets to initial value on every render"}
                ],
                "ans": "a",
                "exp": "useRef provides a mutable reference container whose .current property persists across renders without triggering a re-render when changed.",
                "difficulty": "medium",
                "topic": "React Hooks"
            },
            {
                "q": "What does the expression `const score = 0 ?? 100` evaluate to in JavaScript?",
                "opts": [
                    {"id": "a", "text": "100"},
                    {"id": "b", "text": "0"},
                    {"id": "c", "text": "null"},
                    {"id": "d", "text": "NaN"}
                ],
                "ans": "b",
                "exp": "The nullish coalescing operator ?? returns its right-hand operand only if the left-hand operand is null or undefined. Since 0 is defined, it evaluates to 0.",
                "difficulty": "medium",
                "topic": "Nullish Coalescing"
            },
            {
                "q": "What is the distinction between `useMemo` and `useCallback` in React?",
                "opts": [
                    {"id": "a", "text": "useMemo caches a computed value; useCallback caches a callback function instance between renders"},
                    {"id": "b", "text": "useMemo is for class components; useCallback is for functional components"},
                    {"id": "c", "text": "useCallback runs asynchronously in a web worker"},
                    {"id": "d", "text": "There is no difference; they are aliases"}
                ],
                "ans": "a",
                "exp": "useMemo(() => computeValue(a, b), [a, b]) memoizes the result of a calculation. useCallback(fn, deps) is equivalent to useMemo(() => fn, deps), memoizing the function reference.",
                "difficulty": "medium",
                "topic": "React Optimization"
            },
            {
                "q": "What is the standard, cleanest way to handle errors when consuming asynchronous operations with `async/await`?",
                "opts": [
                    {"id": "a", "text": "Using an unhandledrejection event listener only"},
                    {"id": "b", "text": "Wrapping the awaited calls in a try...catch block"},
                    {"id": "c", "text": "Passing an error callback as the second parameter to await"},
                    {"id": "d", "text": "Checking if the returned value is an instance of Error"}
                ],
                "ans": "b",
                "exp": "await unwraps rejected promises as thrown JavaScript exceptions, making standard try...catch blocks the idiomatic error handling pattern.",
                "difficulty": "easy",
                "topic": "Async & Await"
            },
            {
                "q": "What defines a 'controlled component' in React forms?",
                "opts": [
                    {"id": "a", "text": "An input whose DOM value is managed directly by browser DOM APIs"},
                    {"id": "b", "text": "An input whose value is bound to React state and updated via an onChange event handler"},
                    {"id": "c", "text": "An input wrapped inside a Redux provider"},
                    {"id": "d", "text": "An input that has the disabled attribute"}
                ],
                "ans": "b",
                "exp": "In a controlled component, form data is handled by a React component's state, which acts as the single source of truth for the input's current value.",
                "difficulty": "easy",
                "topic": "Forms & Controlled Components"
            },
            {
                "q": "Given `const [profile, setProfile] = useState({ name: 'Mia', score: 90 });`, what is the correct way to increment the score to 91?",
                "opts": [
                    {"id": "a", "text": "profile.score = 91; setProfile(profile);"},
                    {"id": "b", "text": "setProfile({ ...profile, score: profile.score + 1 });"},
                    {"id": "c", "text": "setProfile(profile.score + 1);"},
                    {"id": "d", "text": "setProfile.score(91);"}
                ],
                "ans": "b",
                "exp": "React state must be treated as immutable. Creating a new object copy with the spread operator (...profile) updates the state reference and triggers a re-render.",
                "difficulty": "easy",
                "topic": "Immutability & State"
            }
        ]
    },
    {
        "title": "SQL & Databases",
        "skill_name": "SQL",
        "difficulty": "intermediate",
        "time_limit_minutes": 15,
        "questions": [
            {
                "q": "Which SQL clause is used to filter rows after aggregate functions have been applied by a `GROUP BY` clause?",
                "opts": [
                    {"id": "a", "text": "WHERE"},
                    {"id": "b", "text": "HAVING"},
                    {"id": "c", "text": "ORDER BY"},
                    {"id": "d", "text": "QUALIFY"}
                ],
                "ans": "b",
                "exp": "WHERE filters individual rows prior to grouping. HAVING filters aggregated group metrics calculated by GROUP BY.",
                "difficulty": "easy",
                "topic": "Grouping & Filtering"
            },
            {
                "q": "What is the result of a `LEFT OUTER JOIN` when a row from the left table has no matching row in the right table?",
                "opts": [
                    {"id": "a", "text": "The left row is dropped from the result set"},
                    {"id": "b", "text": "The left row is retained, with NULL values filled in for all columns of the right table"},
                    {"id": "c", "text": "The query fails with a foreign key violation"},
                    {"id": "d", "text": "The database raises an ambiguous match warning"}
                ],
                "ans": "b",
                "exp": "A LEFT OUTER JOIN preserves all rows from the left table. If no match is found in the right table, right-side columns are populated with NULLs.",
                "difficulty": "easy",
                "topic": "Joins"
            },
            {
                "q": "How does `COUNT(column_name)` handle NULL values compared to `COUNT(*)` in standard SQL?",
                "opts": [
                    {"id": "a", "text": "Both count rows containing NULL values"},
                    {"id": "b", "text": "COUNT(column_name) ignores NULL values, whereas COUNT(*) counts all rows regardless of NULLs"},
                    {"id": "c", "text": "COUNT(column_name) raises an error if any row contains NULL"},
                    {"id": "d", "text": "COUNT(*) ignores rows where all columns are NULL"}
                ],
                "ans": "b",
                "exp": "COUNT(*) tallies the total number of rows in the table or group. COUNT(col) only counts rows where that specific column contains a non-NULL value.",
                "difficulty": "medium",
                "topic": "Aggregate Functions"
            },
            {
                "q": "In ACID transaction properties, what does 'Isolation' guarantee?",
                "opts": [
                    {"id": "a", "text": "Transactions are immediately persisted to non-volatile disk storage"},
                    {"id": "b", "text": "Concurrently executing transactions do not interfere with each other, producing results equivalent to serial execution"},
                    {"id": "c", "text": "All schema constraints and foreign keys are verified before write"},
                    {"id": "d", "text": "All operations in a transaction either completely succeed or roll back"}
                ],
                "ans": "b",
                "exp": "Isolation ensures that the intermediate states of concurrently executing transactions remain invisible to one another, preventing dirty reads and conflicting writes.",
                "difficulty": "easy",
                "topic": "Transactions & ACID"
            },
            {
                "q": "A relational database table is in Second Normal Form (2NF) if it is in 1NF and satisfies which requirement?",
                "opts": [
                    {"id": "a", "text": "It contains no foreign keys"},
                    {"id": "b", "text": "All non-key attributes are fully functionally dependent on the entire primary key (no partial dependencies)"},
                    {"id": "c", "text": "It has no transitive dependencies between non-key attributes"},
                    {"id": "d", "text": "All columns contain JSON data structures"}
                ],
                "ans": "b",
                "exp": "2NF eliminates partial dependencies: every non-prime attribute must depend on the whole candidate key, not merely a subset of a composite primary key.",
                "difficulty": "medium",
                "topic": "Normalization"
            },
            {
                "q": "What type of dependency is specifically eliminated when decomposing a 2NF table into Third Normal Form (3NF)?",
                "opts": [
                    {"id": "a", "text": "Repeating column groups"},
                    {"id": "b", "text": "Partial functional dependencies on composite keys"},
                    {"id": "c", "text": "Transitive dependencies (non-key attributes depending on other non-key attributes)"},
                    {"id": "d", "text": "Primary key self-references"}
                ],
                "ans": "c",
                "exp": "3NF requires that a relation is in 2NF and that every non-key column depends solely and directly on the primary key, eliminating transitive dependencies.",
                "difficulty": "medium",
                "topic": "Normalization"
            },
            {
                "q": "Which data structure is most widely utilized by relational database engines (e.g., PostgreSQL, MySQL InnoDB) for default primary and secondary indexes?",
                "opts": [
                    {"id": "a", "text": "Hash Table"},
                    {"id": "b", "text": "B+ Tree"},
                    {"id": "c", "text": "Skip List"},
                    {"id": "d", "text": "Binary Heap"}
                ],
                "ans": "b",
                "exp": "B+ Trees maintain sorted order with high fanout and store data pointers only at the leaf nodes (linked together), allowing fast O(log N) point lookups and efficient sequential range scans.",
                "difficulty": "medium",
                "topic": "Indexing"
            },
            {
                "q": "Why is `EXISTS (SELECT 1 FROM ...)` often more efficient than `IN (SELECT col FROM ...)` for large subqueries?",
                "opts": [
                    {"id": "a", "text": "EXISTS stores data in RAM while IN uses disk"},
                    {"id": "b", "text": "EXISTS short-circuits as soon as the first matching row is encountered, returning a boolean without materializing all matching records"},
                    {"id": "c", "text": "IN does not support indexed columns"},
                    {"id": "d", "text": "EXISTS automatically normalizes the subquery table"}
                ],
                "ans": "b",
                "exp": "The query optimizer can short-circuit EXISTS immediately upon finding the first match, avoiding full subquery scans and materialization.",
                "difficulty": "medium",
                "topic": "Subqueries"
            },
            {
                "q": "What is the primary difference between a `PRIMARY KEY` and a `UNIQUE` constraint in standard SQL?",
                "opts": [
                    {"id": "a", "text": "A table can have only one PRIMARY KEY which strictly disallows NULLs; a table can have multiple UNIQUE constraints and they typically permit NULLs"},
                    {"id": "b", "text": "UNIQUE constraints cannot be indexed"},
                    {"id": "c", "text": "PRIMARY KEYs are restricted to integer columns only"},
                    {"id": "d", "text": "UNIQUE constraints are only validated on UPDATE, not INSERT"}
                ],
                "ans": "a",
                "exp": "A table is limited to a single PRIMARY KEY (which enforces NOT NULL and uniqueness). In contrast, multiple UNIQUE constraints are allowed on other columns and allow NULL values.",
                "difficulty": "easy",
                "topic": "Constraints"
            },
            {
                "q": "Which SQL statement is executed to undo all modifications made within an active, uncommitted transaction?",
                "opts": [
                    {"id": "a", "text": "UNDO TRANSACTION;"},
                    {"id": "b", "text": "ROLLBACK;"},
                    {"id": "c", "text": "REVERT;"},
                    {"id": "d", "text": "RESET CHANGES;"}
                ],
                "ans": "b",
                "exp": "ROLLBACK reverts all pending writes, updates, and deletes performed since the transaction boundary began, returning the database to its previous committed state.",
                "difficulty": "easy",
                "topic": "Transactions"
            },
            {
                "q": "What is the most secure and effective industry standard technique to prevent SQL injection vulnerabilities in software applications?",
                "opts": [
                    {"id": "a", "text": "Sanitizing input by stripping single quotes in client-side code"},
                    {"id": "b", "text": "Using Parameterized Queries (Prepared Statements)"},
                    {"id": "c", "text": "Concatenating user inputs into dynamic SQL queries"},
                    {"id": "d", "text": "Restricting query execution to HTTP POST requests"}
                ],
                "ans": "b",
                "exp": "Parameterized queries separate the SQL query structure from user data. The database engine treats parameters strictly as literal values rather than executable code.",
                "difficulty": "easy",
                "topic": "Security & Best Practices"
            },
            {
                "q": "What distinguishes a Materialized View from a standard SQL View?",
                "opts": [
                    {"id": "a", "text": "A standard view is physically stored on disk, whereas a materialized view is computed dynamically on each query"},
                    {"id": "b", "text": "A materialized view physically stores the computed query results on disk and can be refreshed, speeding up read queries on complex aggregations"},
                    {"id": "c", "text": "Materialized views can only be created on temporary tables"},
                    {"id": "d", "text": "Standard views cannot contain JOIN clauses"}
                ],
                "ans": "b",
                "exp": "Standard views run their underlying query dynamically every time they are queried. Materialized views persist the query results to disk as physical tables for high performance.",
                "difficulty": "medium",
                "topic": "Views & Optimization"
            },
            {
                "q": "In a foreign key relationship, what occurs when a parent row is deleted and the constraint is defined with `ON DELETE CASCADE`?",
                "opts": [
                    {"id": "a", "text": "An error is raised and parent deletion is blocked"},
                    {"id": "b", "text": "All referencing child rows in the child table are automatically deleted"},
                    {"id": "c", "text": "The foreign key in the child table is set to NULL"},
                    {"id": "d", "text": "The child rows are moved into a system recycling table"}
                ],
                "ans": "b",
                "exp": "ON DELETE CASCADE ensures referential integrity by automatically removing all child records that reference the deleted parent record.",
                "difficulty": "easy",
                "topic": "Foreign Keys & Cascades"
            },
            {
                "q": "What information does the `EXPLAIN` (or `EXPLAIN ANALYZE`) command provide to a database engineer?",
                "opts": [
                    {"id": "a", "text": "It generates documentation comments for tables"},
                    {"id": "b", "text": "It displays the query execution plan, estimated cost, scan types (Index vs Sequential), and execution metrics"},
                    {"id": "c", "text": "It checks user authentication permissions for the query"},
                    {"id": "d", "text": "It converts SQL queries into stored procedures"}
                ],
                "ans": "b",
                "exp": "EXPLAIN exposes the query execution plan formulated by the cost-based query optimizer, highlighting sequential scans, index lookups, join strategies, and execution times.",
                "difficulty": "medium",
                "topic": "Query Performance"
            },
            {
                "q": "What wildcard character is used with the SQL `LIKE` operator to match any sequence of zero or more characters?",
                "opts": [
                    {"id": "a", "text": "*"},
                    {"id": "b", "text": "%"},
                    {"id": "c", "text": "?"},
                    {"id": "d", "text": "_"}
                ],
                "ans": "b",
                "exp": "In standard SQL LIKE pattern matching, '%' matches any sequence of zero or more characters, whereas '_' matches exactly one character.",
                "difficulty": "easy",
                "topic": "Pattern Matching"
            },
            {
                "q": "Why does `SELECT * FROM employees WHERE bonus = NULL;` fail to return records where `bonus` is NULL?",
                "opts": [
                    {"id": "a", "text": "Syntax error in SQL grammar"},
                    {"id": "b", "text": "In three-valued SQL logic, comparing with = NULL evaluates to UNKNOWN; `IS NULL` must be used instead"},
                    {"id": "c", "text": "NULL is treated as the integer 0 by default"},
                    {"id": "d", "text": "The bonus column must be cast to string first"}
                ],
                "ans": "b",
                "exp": "In ANSI SQL three-valued logic (TRUE, FALSE, UNKNOWN), any direct equality check against NULL (e.g. col = NULL) yields UNKNOWN, so IS NULL must be used.",
                "difficulty": "medium",
                "topic": "NULL Handling"
            },
            {
                "q": "What is the key functional difference between using a window function with `OVER (PARTITION BY ...)` versus an aggregation with `GROUP BY`?",
                "opts": [
                    {"id": "a", "text": "GROUP BY preserves individual row identity, while window functions collapse rows"},
                    {"id": "b", "text": "Window functions compute metrics over a set of rows while retaining individual row records; GROUP BY collapses rows into a single summary record per group"},
                    {"id": "c", "text": "Window functions cannot be used with ORDER BY"},
                    {"id": "d", "text": "GROUP BY can only be executed in stored procedures"}
                ],
                "ans": "b",
                "exp": "Window functions perform calculations across partitions of rows without collapsing the result set into fewer rows, retaining each row's individual data.",
                "difficulty": "hard",
                "topic": "Window Functions"
            },
            {
                "q": "What is database horizontal partitioning (sharding)?",
                "opts": [
                    {"id": "a", "text": "Separating columns into different tables on the same server"},
                    {"id": "b", "text": "Distributing rows of a dataset across multiple independent database server nodes using a shard key"},
                    {"id": "c", "text": "Creating automatic disk snapshots every hour"},
                    {"id": "d", "text": "Compressing old historical database tables"}
                ],
                "ans": "b",
                "exp": "Sharding distributes database rows across multiple physical database instances according to a partitioning key, scaling storage and throughput horizontally.",
                "difficulty": "hard",
                "topic": "Scalability & Sharding"
            },
            {
                "q": "Which ANSI SQL transaction isolation level prevents Dirty Reads, Non-Repeatable Reads, and Phantom Reads completely?",
                "opts": [
                    {"id": "a", "text": "Read Uncommitted"},
                    {"id": "b", "text": "Read Committed"},
                    {"id": "c", "text": "Repeatable Read"},
                    {"id": "d", "text": "Serializable"}
                ],
                "ans": "d",
                "exp": "Serializable is the highest isolation level. It executes transactions concurrently in a manner that produces results identical to purely sequential execution, preventing all concurrency anomalies.",
                "difficulty": "hard",
                "topic": "Isolation Levels"
            },
            {
                "q": "Which SQL statement is used to update the values in existing rows of a database table?",
                "opts": [
                    {"id": "a", "text": "MODIFY students SET status = 'active' WHERE id = 10;"},
                    {"id": "b", "text": "UPDATE students SET status = 'active' WHERE id = 10;"},
                    {"id": "c", "text": "ALTER students SET status = 'active' WHERE id = 10;"},
                    {"id": "d", "text": "CHANGE students SET status = 'active' WHERE id = 10;"}
                ],
                "ans": "b",
                "exp": "The UPDATE command modifies existing row values in a table according to specified column assignments and WHERE conditions.",
                "difficulty": "easy",
                "topic": "DML Operations"
            }
        ]
    },
    {
        "title": "Data Structures — Arrays & Sorting",
        "skill_name": "Arrays & Strings",
        "difficulty": "intermediate",
        "time_limit_minutes": 15,
        "questions": [
            {
                "q": "Why do primitive arrays provide constant $O(1)$ random access time to elements by index?",
                "opts": [
                    {"id": "a", "text": "Because elements are hashed into buckets"},
                    {"id": "b", "text": "Because elements are stored in contiguous memory, allowing the target address to be calculated directly via base_address + index * element_size"},
                    {"id": "c", "text": "Because modern CPUs execute binary search automatically"},
                    {"id": "d", "text": "Because array pointers are stored in a balanced search tree"}
                ],
                "ans": "b",
                "exp": "Contiguous memory layout allows constant-time arithmetic memory address calculation without needing to traverse preceding nodes.",
                "difficulty": "easy",
                "topic": "Array Fundamentals"
            },
            {
                "q": "What is an absolute prerequisite for applying Binary Search on an array containing n elements?",
                "opts": [
                    {"id": "a", "text": "All elements must be positive integers"},
                    {"id": "b", "text": "The array must be sorted in monotonic order"},
                    {"id": "c", "text": "The array must not contain duplicate elements"},
                    {"id": "d", "text": "The array size must be an exact power of 2"}
                ],
                "ans": "b",
                "exp": "Binary search compares the target value against the middle element to eliminate half of the remaining elements, which requires the elements to be sorted.",
                "difficulty": "easy",
                "topic": "Searching Algorithms"
            },
            {
                "q": "What is the worst-case time complexity of Binary Search on a sorted array of n elements?",
                "opts": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(n)"},
                    {"id": "c", "text": "O(log n)"},
                    {"id": "d", "text": "O(n log n)"}
                ],
                "ans": "c",
                "exp": "Each step in binary search halves the search space. Halving a space of n elements takes at most log2(n) steps, yielding O(log n) complexity.",
                "difficulty": "easy",
                "topic": "Searching Algorithms"
            },
            {
                "q": "What is the best-case time complexity of an optimized Bubble Sort algorithm that tracks whether any swaps were made during a pass?",
                "opts": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(n)"},
                    {"id": "c", "text": "O(n log n)"},
                    {"id": "d", "text": "O(n^2)"}
                ],
                "ans": "b",
                "exp": "If an array is already sorted, an optimized bubble sort performs a single pass of n-1 comparisons, detects zero swaps, and halts immediately in O(n) time.",
                "difficulty": "medium",
                "topic": "Sorting Algorithms"
            },
            {
                "q": "What is the maximum number of element swaps performed by Selection Sort in the worst case for an array of size n?",
                "opts": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(n) — at most n - 1 swaps"},
                    {"id": "c", "text": "O(n log n)"},
                    {"id": "d", "text": "O(n^2)"}
                ],
                "ans": "b",
                "exp": "Selection sort scans the unsorted portion to find the minimum element and performs at most 1 swap per pass, resulting in at most n-1 swaps total (O(n) writes).",
                "difficulty": "medium",
                "topic": "Sorting Algorithms"
            },
            {
                "q": "For which kind of input array does Insertion Sort achieve near-linear $O(n)$ time performance?",
                "opts": [
                    {"id": "a", "text": "Arrays sorted in reverse order"},
                    {"id": "b", "text": "Nearly sorted arrays where every element is close to its final position"},
                    {"id": "c", "text": "Arrays with completely random, uniformly distributed values"},
                    {"id": "d", "text": "Arrays with large floating-point numbers"}
                ],
                "ans": "b",
                "exp": "Insertion sort is adaptive. When an array is nearly sorted, inner loop shifts are minimal, allowing the algorithm to verify and sort in O(n) time.",
                "difficulty": "easy",
                "topic": "Sorting Algorithms"
            },
            {
                "q": "What is the auxiliary space complexity of standard top-down Merge Sort for an array of n elements?",
                "opts": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(log n)"},
                    {"id": "c", "text": "O(n)"},
                    {"id": "d", "text": "O(n^2)"}
                ],
                "ans": "c",
                "exp": "Merge sort requires O(n) auxiliary storage to hold temporary subarrays while merging sorted halves back together.",
                "difficulty": "easy",
                "topic": "Sorting Algorithms"
            },
            {
                "q": "What causes Quick Sort to degrade to its worst-case time complexity of $O(n^2)$?",
                "opts": [
                    {"id": "a", "text": "The array has negative values"},
                    {"id": "b", "text": "The chosen pivot is consistently the smallest or largest element, partitioning the array into subproblems of size 0 and n - 1"},
                    {"id": "c", "text": "The array contains an even number of elements"},
                    {"id": "d", "text": "Recursion depth exceeds 10 levels"}
                ],
                "ans": "b",
                "exp": "Unbalanced partitions (e.g. picking the first element of an already sorted array) cause n recursive levels with n work at each level, degrading performance to O(n^2).",
                "difficulty": "medium",
                "topic": "Sorting Algorithms"
            },
            {
                "q": "What property defines a 'stable' sorting algorithm?",
                "opts": [
                    {"id": "a", "text": "It runs in O(n log n) under all possible inputs"},
                    {"id": "b", "text": "It preserves the original relative order of elements that have equal keys"},
                    {"id": "c", "text": "It operates in-place with O(1) auxiliary memory"},
                    {"id": "d", "text": "It can sort both linked lists and arrays"}
                ],
                "ans": "b",
                "exp": "A sort is stable if elements with identical comparison keys retain their relative order from the input in the sorted output.",
                "difficulty": "medium",
                "topic": "Sorting Concepts"
            },
            {
                "q": "What is the amortized time complexity of appending an element to a dynamic array (e.g., Python list or C++ std::vector)?",
                "opts": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(n)"},
                    {"id": "c", "text": "O(log n)"},
                    {"id": "d", "text": "O(n^2)"}
                ],
                "ans": "a",
                "exp": "Although resizing requires allocating a new array and copying elements in O(n), geometric capacity doubling ensures that over n appends the average cost per operation is O(1).",
                "difficulty": "medium",
                "topic": "Dynamic Arrays"
            },
            {
                "q": "Which data structure follows the Last-In, First-Out (LIFO) access principle?",
                "opts": [
                    {"id": "a", "text": "Queue"},
                    {"id": "b", "text": "Stack"},
                    {"id": "c", "text": "Binary Heap"},
                    {"id": "d", "text": "Doubly Linked List"}
                ],
                "ans": "b",
                "exp": "A Stack operates on the LIFO principle: elements added last are the first to be removed.",
                "difficulty": "easy",
                "topic": "Stacks & Queues"
            },
            {
                "q": "What are the time complexities for `enqueue` and `dequeue` operations in a standard queue implemented with a linked list having head and tail pointers?",
                "opts": [
                    {"id": "a", "text": "O(n) for both"},
                    {"id": "b", "text": "O(1) for both"},
                    {"id": "c", "text": "O(1) enqueue and O(n) dequeue"},
                    {"id": "d", "text": "O(log n) for both"}
                ],
                "ans": "b",
                "exp": "With pointers maintained to both the head (front) and tail (rear), appending at the tail and removing from the head are both O(1) pointer updates.",
                "difficulty": "easy",
                "topic": "Stacks & Queues"
            },
            {
                "q": "How does inserting an element at the beginning (index 0) of a singly linked list compare with inserting at index 0 of a static array of size n?",
                "opts": [
                    {"id": "a", "text": "Linked list takes O(1) time; array takes O(n) time"},
                    {"id": "b", "text": "Linked list takes O(n) time; array takes O(1) time"},
                    {"id": "c", "text": "Both take O(1) time"},
                    {"id": "d", "text": "Both take O(n) time"}
                ],
                "ans": "a",
                "exp": "Inserting at the head of a linked list only updates the new node's next pointer and head reference in O(1) time. In an array, all n elements must be shifted to the right in O(n) time.",
                "difficulty": "easy",
                "topic": "Linked Lists vs Arrays"
            },
            {
                "q": "What is the time complexity of finding two numbers that sum to a target in an already sorted array using the Two Pointers technique?",
                "opts": [
                    {"id": "a", "text": "O(n^2)"},
                    {"id": "b", "text": "O(n)"},
                    {"id": "c", "text": "O(log n)"},
                    {"id": "d", "text": "O(1)"}
                ],
                "ans": "b",
                "exp": "The two-pointer technique places one pointer at the start and one at the end, moving inward based on the sum comparison, resolving the problem in a single O(n) pass.",
                "difficulty": "medium",
                "topic": "Array Algorithms"
            },
            {
                "q": "How can you detect a cycle in a singly linked list using $O(1)$ auxiliary space?",
                "opts": [
                    {"id": "a", "text": "Store all visited node addresses in a hash table"},
                    {"id": "b", "text": "Floyd's Tortoise and Hare algorithm (slow pointer moves 1 step, fast pointer moves 2 steps)"},
                    {"id": "c", "text": "Reverse the list twice and compare head pointers"},
                    {"id": "d", "text": "Recursively count node depths until a stack overflow occurs"}
                ],
                "ans": "b",
                "exp": "Floyd's cycle-finding algorithm uses two pointers at different speeds. If a cycle exists, the fast pointer will lap and meet the slow pointer within the loop in O(1) auxiliary space.",
                "difficulty": "medium",
                "topic": "Linked Lists"
            },
            {
                "q": "What is the primary performance benefit of using the Sliding Window technique for subarray problems?",
                "opts": [
                    {"id": "a", "text": "It keeps the array sorted during traversal"},
                    {"id": "b", "text": "It avoids redundant recomputation of overlapping subarray intervals, reducing time complexity from O(n^2) to O(n)"},
                    {"id": "c", "text": "It operates without CPU cache misses"},
                    {"id": "d", "text": "It allows in-place array reversal"}
                ],
                "ans": "b",
                "exp": "Instead of recalculating the entire window sum from scratch (O(k)), the sliding window simply adds the incoming element and subtracts the outgoing element in O(1) time.",
                "difficulty": "medium",
                "topic": "Array Techniques"
            },
            {
                "q": "Which of the following sorting algorithms operates strictly in-place with $O(1)$ auxiliary space while guaranteeing $O(n \\log n)$ worst-case time complexity?",
                "opts": [
                    {"id": "a", "text": "Merge Sort"},
                    {"id": "b", "text": "Heapsort"},
                    {"id": "c", "text": "Radix Sort"},
                    {"id": "d", "text": "Quick Sort"}
                ],
                "ans": "b",
                "exp": "Heapsort constructs a max-heap within the array itself and sorts in O(n log n) worst-case time without requiring external buffers or recursive call stack frames, using O(1) auxiliary space.",
                "difficulty": "hard",
                "topic": "Sorting Algorithms"
            },
            {
                "q": "What is the time complexity of deleting the first element (index 0) of an array of size n if the relative order of remaining elements must be maintained?",
                "opts": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(log n)"},
                    {"id": "c", "text": "O(n)"},
                    {"id": "d", "text": "O(n^2)"}
                ],
                "ans": "c",
                "exp": "Deleting index 0 requires shifting all remaining n-1 elements one position left to fill the gap, requiring O(n) operations.",
                "difficulty": "easy",
                "topic": "Array Deletions"
            },
            {
                "q": "What factor determines the auxiliary space complexity of a recursive implementation of Quick Sort?",
                "opts": [
                    {"id": "a", "text": "The number of duplicate elements in the input"},
                    {"id": "b", "text": "The maximum depth of the recursive call stack (O(log n) best, O(n) worst)"},
                    {"id": "c", "text": "The size of the system cache lines"},
                    {"id": "d", "text": "The number of swap operations performed"}
                ],
                "ans": "b",
                "exp": "Every recursive call allocates a stack frame. Balanced pivots require O(log n) stack depth, while completely unbalanced pivots can push depth to O(n).",
                "difficulty": "medium",
                "topic": "Space Complexity"
            },
            {
                "q": "What is the mathematically proven lower bound for the worst-case number of comparisons in any comparison-based sorting algorithm for n elements?",
                "opts": [
                    {"id": "a", "text": "Omega(n)"},
                    {"id": "b", "text": "Omega(n log n)"},
                    {"id": "c", "text": "Omega(n^2)"},
                    {"id": "d", "text": "Omega(log n)"}
                ],
                "ans": "b",
                "exp": "In the decision-tree model for comparison sorting on n elements, there are n! possible permutations. The height of a binary tree with n! leaves is at least log2(n!) = Omega(n log n).",
                "difficulty": "hard",
                "topic": "Sorting Theory"
            }
        ]
    },
    {
        "title": "System Design Fundamentals",
        "skill_name": "System Design",
        "difficulty": "advanced",
        "time_limit_minutes": 15,
        "questions": [
            {
                "q": "What is the key architectural difference between Horizontal Scaling and Vertical Scaling?",
                "opts": [
                    {"id": "a", "text": "Vertical scaling distributes load across multiple servers; horizontal scaling upgrades CPU/RAM on a single machine"},
                    {"id": "b", "text": "Vertical scaling upgrades hardware specifications of a single existing server node; horizontal scaling adds more server instances to distribute load across a cluster"},
                    {"id": "c", "text": "Horizontal scaling is only possible with relational databases"},
                    {"id": "d", "text": "Vertical scaling guarantees zero downtime automatically"}
                ],
                "ans": "b",
                "exp": "Vertical scaling (scaling up) upgrades a single machine's CPU/RAM/disk, which hits hardware limits. Horizontal scaling (scaling out) adds more machines to distribute traffic.",
                "difficulty": "easy",
                "topic": "Scalability"
            },
            {
                "q": "How does the 'Least Connections' load balancing algorithm select the target backend server?",
                "opts": [
                    {"id": "a", "text": "It rotates sequentially through the list of servers in order"},
                    {"id": "b", "text": "It forwards incoming traffic to the server currently handling the fewest active concurrent connections"},
                    {"id": "c", "text": "It hashes the client IP address to ensure session stickiness"},
                    {"id": "d", "text": "It routes requests to the server with the lowest CPU temperature"}
                ],
                "ans": "b",
                "exp": "Least Connections dynamically monitors active connections per node and routes the next request to the server with the least active workload, preventing node starvation.",
                "difficulty": "easy",
                "topic": "Load Balancing"
            },
            {
                "q": "What distinguishes a Layer 7 Load Balancer from a Layer 4 Load Balancer?",
                "opts": [
                    {"id": "a", "text": "Layer 7 only routes raw TCP/UDP packets without inspecting content"},
                    {"id": "b", "text": "Layer 7 inspects application layer payload (HTTP headers, cookies, URL paths) to make content-based routing decisions"},
                    {"id": "c", "text": "Layer 7 operates faster than Layer 4 because it bypasses the network stack"},
                    {"id": "d", "text": "Layer 7 cannot terminate TLS/SSL connections"}
                ],
                "ans": "b",
                "exp": "Layer 7 operates at the Application layer, allowing intelligent routing based on HTTP paths, headers, and cookies. Layer 4 routes at the Transport layer (IP/port) without payload inspection.",
                "difficulty": "medium",
                "topic": "Load Balancing"
            },
            {
                "q": "In the Cache-Aside (Lazy Loading) caching pattern, how are cache misses handled?",
                "opts": [
                    {"id": "a", "text": "The cache layer synchronously issues write queries to disk"},
                    {"id": "b", "text": "The application attempts to read from cache; on miss, it reads from the database, writes the fetched data into the cache, and returns it to the client"},
                    {"id": "c", "text": "The database updates the cache via change data capture"},
                    {"id": "d", "text": "The client browser downloads the raw data from a CDN"}
                ],
                "ans": "b",
                "exp": "In Cache-Aside, application logic coordinates caching: query cache first; on a miss, read from the database, populate the cache for next time, and return the data.",
                "difficulty": "medium",
                "topic": "Caching"
            },
            {
                "q": "How does the Least Recently Used (LRU) cache eviction policy decide which entry to evict when capacity is exceeded?",
                "opts": [
                    {"id": "a", "text": "It evicts the item that has the largest file size"},
                    {"id": "b", "text": "It evicts the item that has not been read or accessed for the longest period of time"},
                    {"id": "c", "text": "It evicts the item with the lowest total request count overall"},
                    {"id": "d", "text": "It evicts entries at random"}
                ],
                "ans": "b",
                "exp": "LRU discards the item that was accessed least recently, typically implemented with a hash map and a doubly linked list for O(1) lookups and updates.",
                "difficulty": "easy",
                "topic": "Caching"
            },
            {
                "q": "According to the CAP Theorem, what trade-off must a distributed database make in the event of a network partition (P)?",
                "opts": [
                    {"id": "a", "text": "The system can preserve both full Consistency and full Availability simultaneously"},
                    {"id": "b", "text": "The system must choose between either Consistency (returning errors or waiting) or Availability (returning stale data)"},
                    {"id": "c", "text": "Network partitions can be prevented by adding redundant routers"},
                    {"id": "d", "text": "The system must automatically switch to a single master database"}
                ],
                "ans": "b",
                "exp": "Network partitions are unavoidable in distributed systems. When network communication breaks between nodes, the system must choose between consistency (CP) or availability (AP).",
                "difficulty": "medium",
                "topic": "CAP Theorem"
            },
            {
                "q": "Which HTTP method is defined as idempotent according to the HTTP/1.1 specification?",
                "opts": [
                    {"id": "a", "text": "POST"},
                    {"id": "b", "text": "PUT"},
                    {"id": "c", "text": "PATCH (standard implementation)"},
                    {"id": "d", "text": "CONNECT"}
                ],
                "ans": "b",
                "exp": "An operation is idempotent if executing it multiple times produces the identical server state as executing it once. PUT replaces a resource entirely and is idempotent, whereas POST creates new resources.",
                "difficulty": "medium",
                "topic": "REST APIs"
            },
            {
                "q": "How does the Token Bucket rate limiting algorithm regulate incoming client traffic?",
                "opts": [
                    {"id": "a", "text": "It counts requests in fixed 60-second windows and resets the counter to 0 at the turn of each minute"},
                    {"id": "b", "text": "Tokens are added to a bucket at a constant refill rate up to a capacity limit; each request consumes a token and is rejected if the bucket is empty"},
                    {"id": "c", "text": "It queues every incoming request until the server CPU load drops below 50%"},
                    {"id": "d", "text": "It hashes the client authorization token"}
                ],
                "ans": "b",
                "exp": "The Token Bucket algorithm accumulates tokens at a steady rate up to bucket capacity. It supports burst traffic while enforcing a strict average rate over time.",
                "difficulty": "medium",
                "topic": "Rate Limiting"
            },
            {
                "q": "What is the primary architectural advantage of placing a Message Queue (e.g. RabbitMQ, Kafka) between microservices?",
                "opts": [
                    {"id": "a", "text": "It replaces relational databases for long-term data storage"},
                    {"id": "b", "text": "It decouples producer and consumer services, enables asynchronous execution, and buffers traffic surges"},
                    {"id": "c", "text": "It automatically generates frontend React components"},
                    {"id": "d", "text": "It forces all microservices to use the same programming language"}
                ],
                "ans": "b",
                "exp": "Message brokers decouple senders and receivers, allowing asynchronous processing, load leveling during traffic spikes, and failure isolation between microservices.",
                "difficulty": "easy",
                "topic": "Message Queues"
            },
            {
                "q": "How does a Content Delivery Network (CDN) reduce page load latency for international users?",
                "opts": [
                    {"id": "a", "text": "By running database migrations inside user web browsers"},
                    {"id": "b", "text": "By caching static assets at geographically distributed Edge Points of Presence (PoPs) close to users"},
                    {"id": "c", "text": "By converting all images into SVG format"},
                    {"id": "d", "text": "By encrypting DNS records"}
                ],
                "ans": "b",
                "exp": "CDNs place edge caching servers around the world so assets (images, CSS, JS, videos) travel shorter physical distances, cutting network round-trip latency.",
                "difficulty": "easy",
                "topic": "CDNs & Caching"
            },
            {
                "q": "What is the primary purpose of configuring Read Replicas in a relational database architecture?",
                "opts": [
                    {"id": "a", "text": "To enable multi-master distributed writes"},
                    {"id": "b", "text": "To offload read queries from the primary database node, scaling read throughput horizontally"},
                    {"id": "c", "text": "To automatically eliminate data redundancy in tables"},
                    {"id": "d", "text": "To replace the need for backups"}
                ],
                "ans": "b",
                "exp": "Most web apps are read-heavy. By funneling reads to replicated slave nodes, the primary master database is freed to focus on write transactions.",
                "difficulty": "easy",
                "topic": "Databases & Scaling"
            },
            {
                "q": "Why is a stateless web server tier preferred when designing for horizontal autoscaling?",
                "opts": [
                    {"id": "a", "text": "Because stateless servers do not require database connections"},
                    {"id": "b", "text": "Because any incoming request can be served by any server instance without relying on local in-memory session data"},
                    {"id": "c", "text": "Because stateless servers use less network bandwidth"},
                    {"id": "d", "text": "Because browsers can cache the entire server"}
                ],
                "ans": "b",
                "exp": "When session state is externalized to Redis or JWTs, server instances can be freely scaled up or down behind a load balancer without dropping active user sessions.",
                "difficulty": "medium",
                "topic": "Stateless Architecture"
            },
            {
                "q": "What is the core distinction between Authentication and Authorization in software security?",
                "opts": [
                    {"id": "a", "text": "Authentication checks permissions; Authorization verifies identity"},
                    {"id": "b", "text": "Authentication verifies identity (who you are); Authorization validates permissions (what you are allowed to access)"},
                    {"id": "c", "text": "Authentication is client-side; Authorization is server-side"},
                    {"id": "d", "text": "There is no difference in modern web APIs"}
                ],
                "ans": "b",
                "exp": "Authentication (AuthN) proves identity (e.g. logging in with password/MFA). Authorization (AuthZ) verifies whether the authenticated identity has rights to access a resource (e.g. RBAC).",
                "difficulty": "easy",
                "topic": "Security & Auth"
            },
            {
                "q": "What are the three components that make up a JSON Web Token (JWT)?",
                "opts": [
                    {"id": "a", "text": "Username, Password, and Role"},
                    {"id": "b", "text": "Header, Payload, and Signature"},
                    {"id": "c", "text": "Domain, Protocol, and Path"},
                    {"id": "d", "text": "Public Key, Private Key, and Salt"}
                ],
                "ans": "b",
                "exp": "A JWT consists of three base64url-encoded parts separated by dots: Header (metadata/algorithm), Payload (claims/data), and Signature (tamper-proof cryptographic hash).",
                "difficulty": "easy",
                "topic": "Security & Auth"
            },
            {
                "q": "In database sharding, what is the 'hotspot' problem?",
                "opts": [
                    {"id": "a", "text": "A physical server overheating in the data center"},
                    {"id": "b", "text": "A situation where an uneven distribution causes a single shard to receive a disproportionate majority of read/write traffic due to an uneven shard key"},
                    {"id": "c", "text": "A memory leak in the database connection pool"},
                    {"id": "d", "text": "Slow disk I/O caused by background vacuuming"}
                ],
                "ans": "b",
                "exp": "Hotspots occur when a poor shard key (e.g. date or popular user ID) concentrates disproportionate traffic onto one shard while others sit idle.",
                "difficulty": "hard",
                "topic": "Sharding & Partitioning"
            },
            {
                "q": "What does a high availability SLA of 'five nines' (99.999% uptime) permit in terms of total unscheduled downtime per calendar year?",
                "opts": [
                    {"id": "a", "text": "Approximately 5.26 minutes per year"},
                    {"id": "b", "text": "Approximately 8.76 hours per year"},
                    {"id": "c", "text": "Approximately 3.65 days per year"},
                    {"id": "d", "text": "Approximately 1 hour per month"}
                ],
                "ans": "a",
                "exp": "0.001% of a year (365.25 days * 24 hours * 60 minutes) equals approximately 5.26 minutes of allowable downtime per year.",
                "difficulty": "medium",
                "topic": "Reliability & SLAs"
            },
            {
                "q": "What is the primary role of the Circuit Breaker pattern in distributed microservice architectures?",
                "opts": [
                    {"id": "a", "text": "To permanently shut down failing microservices and terminate user sessions"},
                    {"id": "b", "text": "To detect consecutive downstream failures and fail fast immediately, preventing cascading system collapse and resource depletion"},
                    {"id": "c", "text": "To encrypt inter-service gRPC communication"},
                    {"id": "d", "text": "To balance requests across database connections"}
                ],
                "ans": "b",
                "exp": "A circuit breaker trips open when downstream failures cross a threshold, immediately returning fallbacks without tying up threads or overwhelming struggling services.",
                "difficulty": "medium",
                "topic": "Resilience Patterns"
            },
            {
                "q": "What does 'Eventual Consistency' mean in distributed storage systems?",
                "opts": [
                    {"id": "a", "text": "Data replicas will always remain inconsistent over time"},
                    {"id": "b", "text": "Given no new updates to an entity, all distributed replicas will eventually converge to reflect the latest update"},
                    {"id": "c", "text": "Every write operation blocks all read operations across the cluster"},
                    {"id": "d", "text": "Data updates are synced once per calendar month"}
                ],
                "ans": "b",
                "exp": "Eventual consistency trades off immediate consistency for high availability and partition tolerance. Updates propagate asynchronously until all replicas converge.",
                "difficulty": "medium",
                "topic": "Distributed Systems"
            },
            {
                "q": "Which HTTP status code should an API return when a client exceeds their rate limit threshold?",
                "opts": [
                    {"id": "a", "text": "400 Bad Request"},
                    {"id": "b", "text": "401 Unauthorized"},
                    {"id": "c", "text": "403 Forbidden"},
                    {"id": "d", "text": "429 Too Many Requests"}
                ],
                "ans": "d",
                "exp": "HTTP 429 Too Many Requests signals that the client has exceeded their allowable rate limit quota within a designated time window.",
                "difficulty": "easy",
                "topic": "HTTP & APIs"
            },
            {
                "q": "Under which scenario is a document-oriented NoSQL database (e.g. MongoDB) generally preferred over a relational SQL database?",
                "opts": [
                    {"id": "a", "text": "When complex multi-table ACID transactions and financial ledger guarantees are strictly required"},
                    {"id": "b", "text": "When dealing with rapidly evolving, hierarchical, semi-structured data requiring dynamic schemas and massive horizontal write scaling"},
                    {"id": "c", "text": "When strict foreign key integrity constraints must be enforced by the database engine"},
                    {"id": "d", "text": "When the predominant workload is relational queries with deep multi-table JOINs"}
                ],
                "ans": "b",
                "exp": "Document stores excel when data schemas evolve rapidly, documents can be stored denormalized without expensive JOINs, and write volume demands horizontal scaling.",
                "difficulty": "medium",
                "topic": "SQL vs NoSQL"
            }
        ]
    }
]


def seed_questions():
    db = SessionLocal()
    try:
        skill_map = {s.name: s for s in db.query(Skill).all()}
        print(f"Loaded {len(skill_map)} skills from database.")

        for adata in ASSESSMENTS_DATA:
            target_title = adata["title"]
            skill = skill_map.get(adata["skill_name"])

            # Find assessment by title or by clean title or skill
            assessment = None
            for existing in db.query(Assessment).all():
                if existing.title.lower() == target_title.lower() or (skill and existing.skill_id == skill.id):
                    assessment = existing
                    break

            if not assessment:
                assessment = Assessment(
                    title=target_title,
                    skill_id=skill.id if skill else None,
                    difficulty=adata["difficulty"],
                    question_count=10,
                    time_limit_minutes=adata["time_limit_minutes"],
                    is_active=True,
                )
                db.add(assessment)
                db.flush()
                print(f"Created new assessment: {target_title} (id: {assessment.id})")
            else:
                assessment.title = target_title
                assessment.difficulty = adata["difficulty"]
                assessment.question_count = 10
                assessment.time_limit_minutes = adata["time_limit_minutes"]
                assessment.is_active = True
                if skill:
                    assessment.skill_id = skill.id
                db.flush()
                print(f"Updating assessment: {target_title} (id: {assessment.id})")

            # Remove previous questions for this assessment to cleanly seed full question bank
            db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == assessment.id).delete()
            db.flush()

            for i, q in enumerate(adata["questions"]):
                aq = AssessmentQuestion(
                    assessment_id=assessment.id,
                    question_text=q["q"],
                    options=q["opts"],
                    correct_answer=q["ans"],
                    explanation=q["exp"],
                    difficulty=q.get("difficulty", adata["difficulty"]),
                    order=i,
                )
                db.add(aq)

            db.flush()
            print(f"  Added {len(adata['questions'])} questions for '{target_title}'")

        db.commit()
        print("\nAll 5 assessments successfully updated with 20 questions each (100 total questions).")
    except Exception as e:
        db.rollback()
        print(f"Error seeding questions: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_questions()
