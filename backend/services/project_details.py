"""
services/project_details.py — Project-specific specifications, roadmaps,
milestones with tasks, setup guides, learning resources, and testing steps.
"""

PROJECT_DETAILS_REGISTRY = {
    1: {
        "problem_statement": "Students and early-career professionals frequently struggle with personal budgeting, unpredictable recurring expenses, and lack of visual clarity on where their money goes. Traditional banking apps are clunky, fail to provide actionable category budgets, and risk privacy when syncing credentials with untrusted third parties.",
        "objectives": [
            "Build a modular full-stack application for recording and managing income and expense ledgers.",
            "Implement category-based budget caps with real-time percentage thresholds and overspending warnings.",
            "Create interactive financial charts comparing monthly cash flows and spending distributions.",
            "Provide downloadable CSV transaction reports and savings goal progress trackers."
        ],
        "prerequisites": [
            "Python 3.11+ fundamentals and virtual environment setup",
            "RESTful API design concepts and HTTP status codes",
            "Relational database modeling with SQLite or PostgreSQL",
            "React functional components, hooks (useState, useEffect, useMemo), and basic CSS"
        ],
        "expected_outcome": "A fully functional personal finance portal where students can register/login, log categorized transactions, track visual budget gauges with color-coded alerts, view month-over-month cash flow graphs, and track savings goals to completion.",
        "required_tools": [
            "Python 3.11+",
            "Node.js 18+ & npm",
            "FastAPI & Uvicorn",
            "SQLite / PostgreSQL",
            "React 18 & Vite",
            "Recharts (Data Visualization)",
            "Lucide React Icons",
            "Postman or Thunder Client for API testing"
        ],
        "setup_instructions": [
            "1. Clone or initialize the project repository: `git init personal-finance-tracker`",
            "2. Set up Python virtual environment: `python -m venv venv` and activate it (`venv\\Scripts\\activate` on Windows)",
            "3. Install backend dependencies: `pip install fastapi uvicorn sqlalchemy pydantic python-multipart`",
            "4. Initialize React frontend: `npx create-vite@latest client --template react-ts`",
            "5. Install client dependencies: `cd client && npm install axios recharts lucide-react`",
            "6. Create a `.env` file with `DATABASE_URL=sqlite:///./finance.db` and `API_PORT=8000`",
            "7. Launch backend server: `uvicorn main:app --reload --port 8000`",
            "8. Launch frontend server: `npm run dev -- --port 3000`"
        ],
        "learning_resources": [
            {
                "title": "FastAPI Full Tutorial: Building Relational APIs",
                "url": "https://fastapi.tiangolo.com/tutorial/sql-databases/",
                "type": "Documentation"
            },
            {
                "title": "Recharts Guide: Building Area and Pie Charts in React",
                "url": "https://recharts.org/en-US/guide",
                "type": "Guide"
            },
            {
                "title": "ACID Transactions and Ledger Modeling Best Practices",
                "url": "https://en.wikipedia.org/wiki/Double-entry_bookkeeping",
                "type": "Article"
            }
        ],
        "testing_steps": [
            "1. Unit test transaction models: Ensure amount cannot be negative or zero for expense records.",
            "2. API integration test: POST /api/transactions with valid payload returns HTTP 201 and updates account balance.",
            "3. Category budget test: Verify that exceeding category budget triggers warning flag in GET /api/budgets/summary.",
            "4. Frontend state test: Confirm adding an expense dynamically re-renders Recharts donut graph without requiring page refresh.",
            "5. Export test: Trigger CSV export and verify correct headers, date formatting, and transaction rows."
        ],
        "roadmap_steps": [
            "Phase 1: Project Setup & Ledger Database Architecture",
            "Phase 2: Transaction Engine & Category Budgeting API",
            "Phase 3: Interactive Dashboard & Recharts Visualizations",
            "Phase 4: Savings Goals Tracker & CSV Export Utilities",
            "Phase 5: Automated Testing, UI Polish & Documentation"
        ],
        "milestones": [
            {
                "id": 1,
                "title": "Milestone 1: Project Setup & Database Schema Design",
                "description": "Initialize backend and frontend project structure, configure database connections, and create foundational models.",
                "estimated_hours": 4.0,
                "tasks": [
                    { "id": "m1-t1", "text": "Set up FastAPI backend directory structure with config, database, and router layers." },
                    { "id": "m1-t2", "text": "Define SQLAlchemy models for Users, Accounts, Categories, Transactions, and Budgets." },
                    { "id": "m1-t3", "text": "Set up database migrations / initial table creation script." },
                    { "id": "m1-t4", "text": "Create seed script with default categories (Food, Rent, Education, Entertainment, Savings)." }
                ]
            },
            {
                "id": 2,
                "title": "Milestone 2: Transaction Ledger & Category Budgeting API",
                "description": "Build REST endpoints for logging income/expenses and calculating category budget limits.",
                "estimated_hours": 5.0,
                "tasks": [
                    { "id": "m2-t1", "text": "Implement POST /api/transactions and GET /api/transactions with date and category filters." },
                    { "id": "m2-t2", "text": "Implement PUT and DELETE transaction endpoints with balance consistency checks." },
                    { "id": "m2-t3", "text": "Build category budget limit validator returning percentage spent vs allocated." },
                    { "id": "m2-t4", "text": "Write Pytest test suite covering transaction calculations and edge cases." }
                ]
            },
            {
                "id": 3,
                "title": "Milestone 3: Interactive Analytics & Charting Frontend",
                "description": "Construct the React user interface featuring financial metric cards and Recharts visualizations.",
                "estimated_hours": 6.0,
                "tasks": [
                    { "id": "m3-t1", "text": "Build financial overview cards (Total Balance, Monthly Income, Monthly Burn, Savings Rate)." },
                    { "id": "m3-t2", "text": "Integrate Recharts Donut / Pie Chart displaying spending breakdown by category." },
                    { "id": "m3-t3", "text": "Implement monthly income vs. expense comparative bar chart." },
                    { "id": "m3-t4", "text": "Create quick-add modal form for logging transactions with responsive layout." }
                ]
            },
            {
                "id": 4,
                "title": "Milestone 4: Savings Goals, Export & Verification",
                "description": "Implement savings goal progress trackers, CSV export functionality, and end-to-end verification.",
                "estimated_hours": 5.0,
                "tasks": [
                    { "id": "m4-t1", "text": "Implement Savings Goals widget with target deadline and animated percentage progress bars." },
                    { "id": "m4-t2", "text": "Add CSV transaction export endpoint and browser download trigger." },
                    { "id": "m4-t3", "text": "Conduct end-to-end user testing across mobile and desktop breakpoints." },
                    { "id": "m4-t4", "text": "Write comprehensive project README with setup instructions and architecture diagram." }
                ]
            }
        ]
    },
    2: {
        "problem_statement": "Online retail platforms require highly reliable, concurrent architectures that handle product browsing, atomic inventory reservations, shopping cart state persistence across devices, payment verification, and order fulfillment tracking without inventory overselling or database lockups.",
        "objectives": [
            "Develop a scalable decoupled e-commerce architecture using TypeScript, React, Node.js/Express, and PostgreSQL.",
            "Implement a high-performance product catalog with multi-facet filtering (category, price range, brand, ratings).",
            "Build an atomic shopping cart and checkout pipeline with inventory validation.",
            "Integrate a secure payment intent flow with webhook verification and order lifecycle management.",
            "Containerize the entire application using Docker Compose."
        ],
        "prerequisites": [
            "TypeScript and ES6+ asynchronous programming (async/await, promises)",
            "Relational database design (normalization, primary/foreign keys, indices)",
            "State management in React (Context API or Zustand) and React Router",
            "Basic understanding of Docker containerization and environment variables"
        ],
        "expected_outcome": "A production-grade e-commerce application featuring product catalog with filters and search, persistent shopping cart, checkout flow with payment verification, order history tracking, and an admin inventory management panel.",
        "required_tools": [
            "Node.js 18+ & npm",
            "Docker Desktop & Docker Compose",
            "PostgreSQL 15+",
            "TypeScript & Vite",
            "TailwindCSS",
            "Postman or Thunder Client"
        ],
        "setup_instructions": [
            "1. Clone project repo and verify Docker: `docker --version`",
            "2. Setup environment variables: copy `.env.example` to `.env` with DB credentials and JWT secret",
            "3. Spin up PostgreSQL database container: `docker compose up -d postgres`",
            "4. Navigate to server: `cd server && npm install && npm run db:migrate`",
            "5. Seed product catalog: `npm run db:seed`",
            "6. Navigate to client: `cd ../client && npm install`",
            "7. Start development mode: `npm run dev` in both server and client folders",
            "8. Open browser at `http://localhost:3000` to browse store catalog"
        ],
        "learning_resources": [
            {
                "title": "Designing Data-Intensive Applications: Concurrency in E-Commerce",
                "url": "https://dataintensive.net/",
                "type": "Book"
            },
            {
                "title": "Stripe API Documentation: Custom Payment Flow & Webhooks",
                "url": "https://stripe.com/docs/payments/accept-a-payment",
                "type": "Documentation"
            },
            {
                "title": "Dockerizing Full-Stack Node.js and React Applications",
                "url": "https://docs.docker.com/get-started/",
                "type": "Guide"
            }
        ],
        "testing_steps": [
            "1. Concurrency test: Trigger two simultaneous checkouts for a product with 1 stock; verify only one succeeds.",
            "2. Cart persistence test: Add items to cart, refresh browser, and verify cart contents remain intact.",
            "3. Search & filter test: Verify price range slider and category checkboxes filter catalog correctly.",
            "4. Webhook test: Simulate payment webhook event and verify order changes from 'pending' to 'paid'.",
            "5. Containerization test: Run `docker compose up --build` and confirm all containers start healthy."
        ],
        "roadmap_steps": [
            "Phase 1: Database Normalization & Product Catalog API",
            "Phase 2: Shopping Cart State & Inventory Reservation",
            "Phase 3: Checkout Pipeline & Payment Webhook Handler",
            "Phase 4: Order Lifecycle & Customer Dashboard",
            "Phase 5: Containerization, Load Testing & Production Deployment"
        ],
        "milestones": [
            {
                "id": 1,
                "title": "Milestone 1: Database Normalization & Product Catalog API",
                "description": "Design PostgreSQL schema for products, categories, inventory, and users, and build paginated search endpoints.",
                "estimated_hours": 12.0,
                "tasks": [
                    { "id": "m1-t1", "text": "Design schema for Users, Products, Categories, Inventory, Orders, and OrderItems." },
                    { "id": "m1-t2", "text": "Build product query API with pagination, text search, price filtering, and category sorting." },
                    { "id": "m1-t3", "text": "Implement secure authentication with JWT and role-based permissions (Customer vs Admin)." },
                    { "id": "m1-t4", "text": "Create seed script populating 30+ products across multiple categories with mock image URLs." }
                ]
            },
            {
                "id": 2,
                "title": "Milestone 2: Persistent Shopping Cart & Stock Validation",
                "description": "Develop the client-side cart experience with local storage sync and server-side stock validation.",
                "estimated_hours": 15.0,
                "tasks": [
                    { "id": "m2-t1", "text": "Build React Cart Context with optimistic item addition, quantity adjustments, and removal." },
                    { "id": "m2-t2", "text": "Sync cart state with localStorage and backend user profile upon login." },
                    { "id": "m2-t3", "text": "Implement pre-checkout inventory validation endpoint verifying real-time stock levels." },
                    { "id": "m2-t4", "text": "Build interactive slide-out cart drawer and responsive dedicated cart summary view." }
                ]
            },
            {
                "id": 3,
                "title": "Milestone 3: Checkout Flow & Payment Webhook Handling",
                "description": "Implement multi-step checkout with address validation, payment intent creation, and webhook fulfillment.",
                "estimated_hours": 18.0,
                "tasks": [
                    { "id": "m3-t1", "text": "Build multi-step checkout form (Shipping Details -> Review Items -> Payment Selection)." },
                    { "id": "m3-t2", "text": "Implement backend payment intent creation endpoint generating secure client secrets." },
                    { "id": "m3-t3", "text": "Write idempotent payment webhook handler that marks orders as 'paid' and updates inventory atomically." },
                    { "id": "m3-t4", "text": "Implement automated stock rollback logic if payment fails or is cancelled." }
                ]
            },
            {
                "id": 4,
                "title": "Milestone 4: Order Dashboard & Docker Containerization",
                "description": "Build order history view, admin inventory dashboard, and package with Docker Compose.",
                "estimated_hours": 15.0,
                "tasks": [
                    { "id": "m4-t1", "text": "Build customer order history page with itemized receipts and status tracking badges." },
                    { "id": "m4-t2", "text": "Build admin dashboard allowing inventory adjustments and order status updates." },
                    { "id": "m4-t3", "text": "Write multi-stage Dockerfiles for client and server and create docker-compose.yml." },
                    { "id": "m4-t4", "text": "Execute end-to-end purchasing test and document deployment procedures in README." }
                ]
            }
        ]
    },
    3: {
        "problem_statement": "Real estate appraisal and valuation requires analyzing multi-dimensional parameters including square footage, geographic zip codes, bed/bath counts, and construction year. Manual assessments are slow, prone to cognitive bias, and unable to scale for programmatic mortgage underwriting and fintech applications.",
        "objectives": [
            "Perform comprehensive exploratory data analysis (EDA), cleaning, and feature engineering on housing price datasets.",
            "Train and cross-validate regression models (Linear Regression, Random Forest, Gradient Boosting / XGBoost).",
            "Construct an end-to-end Scikit-learn Pipeline with automated scaling and categorical encoders.",
            "Serialize the production model and serve it via a high-performance FastAPI microservice with input schema validation.",
            "Package the inference service in an optimized, production-ready Docker container."
        ],
        "prerequisites": [
            "Python data science stack (Pandas, NumPy, Scikit-learn)",
            "Regression machine learning theory (loss functions, RMSE, MAE, R², overfitting/regularization)",
            "FastAPI and Pydantic schema validation",
            "Basic understanding of containerization with Docker"
        ],
        "expected_outcome": "A containerized machine learning microservice that accepts housing specifications via JSON REST endpoint, performs validated inference in sub-50ms latency, returns confidence intervals and feature importance breakdown, and includes an interactive web test interface.",
        "required_tools": [
            "Python 3.11+",
            "Jupyter Notebook",
            "Pandas & NumPy",
            "Scikit-learn & Joblib",
            "FastAPI & Pydantic",
            "Docker & Docker Desktop",
            "Matplotlib / Seaborn for EDA visualization"
        ],
        "setup_instructions": [
            "1. Clone or initialize project directory: `git init ml-price-prediction`",
            "2. Create virtual environment: `python -m venv venv && venv\\Scripts\\activate`",
            "3. Install ML and API requirements: `pip install pandas numpy scikit-learn joblib fastapi uvicorn pydantic matplotlib seaborn pytest`",
            "4. Download Kaggle housing dataset into `data/housing_data.csv`",
            "5. Launch Jupyter to run EDA notebook: `jupyter notebook notebooks/01_eda_and_feature_engineering.ipynb`",
            "6. Execute model training script: `python src/train.py --output models/pipeline_v1.joblib`",
            "7. Launch FastAPI inference server: `uvicorn src.api:app --reload --port 8000`",
            "8. Open browser at `http://localhost:8000/docs` to test inference endpoints"
        ],
        "learning_resources": [
            {
                "title": "Scikit-Learn Guide: Building Production Pipelines",
                "url": "https://scikit-learn.org/stable/modules/compose.html",
                "type": "Documentation"
            },
            {
                "title": "FastAPI Model Serving Best Practices",
                "url": "https://fastapi.tiangolo.com/deployment/",
                "type": "Guide"
            },
            {
                "title": "Feature Engineering and Outlier Treatment for Tabular Data",
                "url": "https://towardsdatascience.com/feature-engineering-for-machine-learning-3a5e293a5114",
                "type": "Article"
            }
        ],
        "testing_steps": [
            "1. Out-of-bounds input test: Send negative square footage; verify Pydantic returns HTTP 422 with descriptive error.",
            "2. Baseline benchmark: Verify trained Random Forest achieves R² score >= 0.85 on held-out test split.",
            "3. Latency benchmark: Run 100 consecutive requests to /predict; confirm p95 latency is under 50ms.",
            "4. Serialization integrity: Ensure loaded model artifact produces identical predictions to in-memory trained model.",
            "5. Docker test: Build image `docker build -t ml-price-api .` and verify container health check passes."
        ],
        "roadmap_steps": [
            "Phase 1: Exploratory Data Analysis & Feature Engineering",
            "Phase 2: Model Training, Evaluation & Hyperparameter Tuning",
            "Phase 3: Pipeline Serialization & FastAPI Microservice Development",
            "Phase 4: Interactive Web Playground UI & Batch Inference",
            "Phase 5: Docker Containerization, Latency Optimization & Deployment"
        ],
        "milestones": [
            {
                "id": 1,
                "title": "Milestone 1: Exploratory Data Analysis & Preprocessing Pipeline",
                "description": "Analyze dataset distributions, handle missing values, engineer location features, and build scikit-learn transformers.",
                "estimated_hours": 8.0,
                "tasks": [
                    { "id": "m1-t1", "text": "Ingest raw housing dataset and generate statistical distributions and correlation matrices." },
                    { "id": "m1-t2", "text": "Handle missing values, detect outliers via IQR method, and apply log-transformation to target price." },
                    { "id": "m1-t3", "text": "Engineer domain features (price_per_sqft, property_age, total_rooms_ratio)." },
                    { "id": "m1-t4", "text": "Construct reusable Scikit-learn ColumnTransformer for numerical scaling and one-hot encoding." }
                ]
            },
            {
                "id": 2,
                "title": "Milestone 2: Model Training, Evaluation & Hyperparameter Tuning",
                "description": "Train multiple regression algorithms, evaluate using cross-validation, tune hyperparameters, and serialize optimal pipeline.",
                "estimated_hours": 12.0,
                "tasks": [
                    { "id": "m2-t1", "text": "Implement baseline Linear Regression, Ridge, and Random Forest regressors with 5-fold CV." },
                    { "id": "m2-t2", "text": "Train Gradient Boosting / XGBoost regressor and compute RMSE, MAE, and R2 metrics." },
                    { "id": "m2-t3", "text": "Execute GridSearchCV / RandomizedSearchCV to optimize tree depth, learning rate, and estimators." },
                    { "id": "m2-t4", "text": "Serialize the final trained pipeline (preprocessor + model) into `models/price_model.joblib`." }
                ]
            },
            {
                "id": 3,
                "title": "Milestone 3: FastAPI Production Inference Service",
                "description": "Develop high-throughput REST API with Pydantic validation, error handling, and model lifecycle management.",
                "estimated_hours": 10.0,
                "tasks": [
                    { "id": "m3-t1", "text": "Define Pydantic input schema with strict field validators (e.g., bedrooms >= 1, sqft > 100)." },
                    { "id": "m3-t2", "text": "Implement FastAPI startup event to load model artifact once into memory." },
                    { "id": "m3-t3", "text": "Build POST /predict endpoint returning predicted price, currency formatting, and confidence range." },
                    { "id": "m3-t4", "text": "Implement POST /batch-predict endpoint processing CSV uploads or array payloads." }
                ]
            },
            {
                "id": 4,
                "title": "Milestone 4: Interactive Playground & Docker Containerization",
                "description": "Build interactive test client UI, write multi-stage Dockerfile, and benchmark service throughput.",
                "estimated_hours": 10.0,
                "tasks": [
                    { "id": "m4-t1", "text": "Create interactive React form with real-time sliders allowing users to test instant valuations." },
                    { "id": "m4-t2", "text": "Display feature importance graph explaining which factors influenced the predicted valuation." },
                    { "id": "m4-t3", "text": "Write optimized production Dockerfile (`python:3.11-slim`) with healthcheck endpoint." },
                    { "id": "m4-t4", "text": "Run automated load test verifying sub-50ms response times under 50 concurrent requests." }
                ]
            }
        ]
    },
    4: {
        "problem_statement": "Distributed teams and online learning communities need responsive, reliable real-time communication tools. Building scalable chat requires handling bi-directional socket connections, organizing rooms and direct messages, displaying instant typing status and presence indicators, and preserving message history during disconnections.",
        "objectives": [
            "Architect a bi-directional real-time communication server using Node.js, Express, and Socket.io.",
            "Implement channel/room partitioning and authenticated private 1-on-1 direct messaging.",
            "Build optimistic message delivery in React with instantaneous rendering and delivery confirmation checkmarks.",
            "Store conversation history in a persistent database with cursor-based pagination for infinite scrolling.",
            "Implement live presence detection (Online/Away/Offline) and debounced typing status indicators."
        ],
        "prerequisites": [
            "JavaScript / TypeScript and modern React hooks",
            "Event-driven architecture and WebSocket / Socket.io protocols",
            "Database querying and cursor pagination with MongoDB or PostgreSQL",
            "CSS layout fundamentals for chat scroll panes and responsive navigation"
        ],
        "expected_outcome": "A fully functional modern chat application with public channels, private direct messaging, real-time message broadcasting, typing indicators, active user lists, and persistent chat history with infinite scroll.",
        "required_tools": [
            "Node.js 18+ & npm",
            "Socket.io & Socket.io-client",
            "Express.js",
            "MongoDB (Mongoose) or PostgreSQL",
            "React 18 & Vite",
            "TailwindCSS & Lucide React",
            "Chrome DevTools (WS inspection)"
        ],
        "setup_instructions": [
            "1. Initialize server: `cd server && npm init -y`",
            "2. Install server packages: `npm install express socket.io cors dotenv jsonwebtoken mongoose`",
            "3. Initialize React client: `cd ../client && npm install socket.io-client react-router-dom lucide-react`",
            "4. Configure `.env` in server with `PORT=5000`, `JWT_SECRET=secret`, and `MONGO_URI`",
            "5. Start backend socket server: `npm run dev` in server directory",
            "6. Start client frontend: `npm run dev` in client directory",
            "7. Open two browser windows side-by-side to test real-time message synchronization"
        ],
        "learning_resources": [
            {
                "title": "Socket.io Documentation: Rooms, Namespaces, and Acknowledgments",
                "url": "https://socket.io/docs/v4/",
                "type": "Documentation"
            },
            {
                "title": "Designing Real-Time Chat Architecture at Scale",
                "url": "https://discord.com/blog/how-discord-stores-billions-of-messages",
                "type": "Case Study"
            },
            {
                "title": "React Optimistic UI Updates Pattern",
                "url": "https://react.dev/reference/react/useOptimistic",
                "type": "Guide"
            }
        ],
        "testing_steps": [
            "1. Cross-tab real-time test: Send message from Tab A; verify it appears in Tab B within 50ms without reload.",
            "2. Channel isolation test: Send message in '#general'; confirm users in '#random' do not receive the event.",
            "3. Disconnection recovery test: Turn off network in DevTools, send message, re-enable network; verify reconnect.",
            "4. Typing indicator debounce test: Type in input, stop typing; confirm indicator clears after 2.5s.",
            "5. Pagination test: Scroll to top of chat pane; verify earlier messages load without jumping scroll position."
        ],
        "roadmap_steps": [
            "Phase 1: WebSocket Handshake, Auth & Connection Lifecycle",
            "Phase 2: Channel Pub-Sub & Bi-directional Message Broadcast",
            "Phase 3: Database Persistence & Cursor-Based Message History",
            "Phase 4: Real-Time Presence & Typing Status Engine",
            "Phase 5: Responsive UI Polish, Sound Notifications & Deployment"
        ],
        "milestones": [
            {
                "id": 1,
                "title": "Milestone 1: WebSocket Server & Client Handshake",
                "description": "Establish authenticated Socket.io server connection and build custom React connection hook.",
                "estimated_hours": 7.0,
                "tasks": [
                    { "id": "m1-t1", "text": "Set up Express server integrated with Socket.io HTTP server instance and CORS origin policy." },
                    { "id": "m1-t2", "text": "Implement JWT authentication handshake middleware verifying token before socket connection." },
                    { "id": "m1-t3", "text": "Create custom `useSocket` React hook managing connection state and automatic reconnection logic." },
                    { "id": "m1-t4", "text": "Build connection status banner (Connected, Reconnecting, Offline) in the frontend header." }
                ]
            },
            {
                "id": 2,
                "title": "Milestone 2: Channels, Rooms & Message Broadcasting",
                "description": "Implement channel joining/leaving, broadcasting message payloads, and optimistic client rendering.",
                "estimated_hours": 9.0,
                "tasks": [
                    { "id": "m2-t1", "text": "Implement socket event handlers for `join_room` and `leave_room` to isolate channel traffic." },
                    { "id": "m2-t2", "text": "Create `send_message` and `new_message` events with sender metadata, avatar, and timestamp." },
                    { "id": "m2-t3", "text": "Implement client-side optimistic UI rendering displaying message immediately with 'sending' indicator." },
                    { "id": "m2-t4", "text": "Design responsive chat window layout with message list pane and bottom message composer." }
                ]
            },
            {
                "id": 3,
                "title": "Milestone 3: Database Persistence & History Pagination",
                "description": "Persist all chat messages in database and implement reverse cursor pagination for infinite scrolling.",
                "estimated_hours": 10.0,
                "tasks": [
                    { "id": "m3-t1", "text": "Define database models for Channels, DirectConversations, and Messages with timestamp indices." },
                    { "id": "m3-t2", "text": "Save incoming socket messages to database with asynchronous persistence queue." },
                    { "id": "m3-t3", "text": "Build GET /api/channels/{id}/messages endpoint using cursor pagination (limit 30 per page)." },
                    { "id": "m3-t4", "text": "Implement infinite scroll in React that preserves scroll position when older messages load." }
                ]
            },
            {
                "id": 4,
                "title": "Milestone 4: Presence Detection, Typing Indicators & Polish",
                "description": "Build user online/offline status broadcast, debounced typing notifications, and polished UI.",
                "estimated_hours": 9.0,
                "tasks": [
                    { "id": "m4-t1", "text": "Implement in-memory active socket mapping to track and broadcast user online/offline presence." },
                    { "id": "m4-t2", "text": "Add debounced `typing_start` and `typing_stop` socket events ('Alice is typing...')." },
                    { "id": "m4-t3", "text": "Build channel member sidebar showing active vs idle members." },
                    { "id": "m4-t4", "text": "Conduct multi-client stress testing and finalize setup documentation." }
                ]
            }
        ]
    },
    5: {
        "problem_statement": "Computer science students preparing for technical interviews frequently practice hundreds of Data Structures and Algorithms (DSA) questions across multiple platforms. However, they lack a centralized system to organize problems by core patterns (Sliding Window, Two Pointers, Dynamic Programming), record personal code templates, and schedule spaced repetition to prevent forgetting problem solutions before interviews.",
        "objectives": [
            "Build an intuitive problem catalog dashboard with difficulty filtering (Easy, Medium, Hard) and pattern categories.",
            "Create a personal solution notebook supporting syntax highlighting, complexity analysis, and approach notes.",
            "Implement a spaced-repetition revision scheduling engine based on the Leitner / SuperMemo algorithm.",
            "Design visual pattern mastery analytics showing progress towards FAANG/Tier-1 interview benchmarks.",
            "Support exportable revision cheat-sheets formatted in clean Markdown/PDF."
        ],
        "prerequisites": [
            "React, TypeScript, and modern component architecture",
            "Foundational Data Structures and Algorithms knowledge (Arrays, Linked Lists, Trees, Graphs, DP)",
            "FastAPI / Node.js REST API design and relational data modeling",
            "Understanding of spaced-repetition memory intervals"
        ],
        "expected_outcome": "A full-featured interview preparation dashboard where students can browse DSA problems, log their submissions and complexity analysis, filter by pattern, and track revision queues with calendar reminders.",
        "required_tools": [
            "React 18 & TypeScript",
            "Python 3.11+ & FastAPI",
            "SQLite or PostgreSQL",
            "Monaco Editor or CodeMirror (Code Highlighting)",
            "Recharts (Pattern Mastery Donuts)",
            "Lucide React Icons",
            "TailwindCSS"
        ],
        "setup_instructions": [
            "1. Initialize repository: `git init problem-solver-dashboard`",
            "2. Setup backend environment: `cd backend && python -m venv venv && venv\\Scripts\\activate`",
            "3. Install backend dependencies: `pip install fastapi uvicorn sqlalchemy pydantic`",
            "4. Run backend problem seed script: `python seed_dsa_catalog.py`",
            "5. Initialize frontend: `cd ../frontend && npm install`",
            "6. Install editor and charting libraries: `npm install recharts lucide-react`",
            "7. Start backend service: `uvicorn main:app --reload --port 8000`",
            "8. Start frontend dev server: `npm run dev -- --port 3000`"
        ],
        "learning_resources": [
            {
                "title": "NeetCode 150: Coding Interview Patterns Breakdown",
                "url": "https://neetcode.io/roadmap",
                "type": "Roadmap"
            },
            {
                "title": "Spaced Repetition Algorithms for Algorithmic Retention",
                "url": "https://en.wikipedia.org/wiki/SuperMemo",
                "type": "Article"
            },
            {
                "title": "FastAPI + React Production Architecture",
                "url": "https://fastapi.tiangolo.com/tutorial/",
                "type": "Guide"
            }
        ],
        "testing_steps": [
            "1. Problem filtering test: Select 'Dynamic Programming' and 'Medium'; confirm only matching problems display.",
            "2. Spaced repetition test: Solve a problem today; verify next scheduled review date is accurately set to +3 days.",
            "3. Code snippet persistence test: Save a Python solution with notes; reload page and verify code is intact.",
            "4. Mastery computation test: Solve 5 out of 10 'Two Pointers' problems; confirm pattern progress bar shows 50%.",
            "5. Mobile view test: Test problem solver table and editor pane on mobile screen (375px)."
        ],
        "roadmap_steps": [
            "Phase 1: Problem Catalog Schema & Blind 75 Dataset Seeding",
            "Phase 2: Solution Logger, Code Viewer & Complexity Form",
            "Phase 3: Spaced Repetition Scheduling Engine (Leitner Intervals)",
            "Phase 4: Pattern Mastery Analytics & Progress Visualizations",
            "Phase 5: Search, Filter, Export & Polish"
        ],
        "milestones": [
            {
                "id": 1,
                "title": "Milestone 1: Problem Catalog & Database Setup",
                "description": "Design database schema for DSA problems, patterns, submissions, and revision logs, and seed initial problem set.",
                "estimated_hours": 5.0,
                "tasks": [
                    { "id": "m1-t1", "text": "Design relational schema for Problems, AlgorithmTags, StudentSubmissions, and RevisionQueues." },
                    { "id": "m1-t2", "text": "Write seed script importing 50+ curated algorithm problems with difficulty and pattern tags." },
                    { "id": "m1-t3", "text": "Build GET /api/problems endpoint with search, difficulty, and pattern filter queries." },
                    { "id": "m1-t4", "text": "Build responsive catalog table displaying problem titles, difficulty badges, and solved status." }
                ]
            },
            {
                "id": 2,
                "title": "Milestone 2: Solution Logger & Complexity Tracker",
                "description": "Create problem detail modal with code editor, time/space complexity inputs, and personal takeaway notes.",
                "estimated_hours": 6.0,
                "tasks": [
                    { "id": "m2-t1", "text": "Build problem detail modal with problem description, constraints, and external LeetCode links." },
                    { "id": "m2-t2", "text": "Embed solution code viewer/editor with syntax highlighting for Python and TypeScript." },
                    { "id": "m2-t3", "text": "Implement submission form recording Time Complexity O(N), Space Complexity O(1), and notes." },
                    { "id": "m2-t4", "text": "Build backend endpoint saving student solution records and updating solved status." }
                ]
            },
            {
                "id": 3,
                "title": "Milestone 3: Spaced Repetition Scheduling Engine",
                "description": "Implement automated spaced repetition calculation scheduling review reminders at 1, 3, 7, and 30 day intervals.",
                "estimated_hours": 7.0,
                "tasks": [
                    { "id": "m3-t1", "text": "Implement Leitner spaced repetition interval calculator based on user recall ratings (1-5)." },
                    { "id": "m3-t2", "text": "Build 'Due for Revision Today' widget highlighting problems needing review." },
                    { "id": "m3-t3", "text": "Add 'Mark Reviewed' quick-action button that automatically advances problem to next review horizon." },
                    { "id": "m3-t4", "text": "Build calendar/agenda view showing upcoming scheduled problem revisions." }
                ]
            },
            {
                "id": 4,
                "title": "Milestone 4: Pattern Mastery Analytics & Cheat Sheet Export",
                "description": "Build pattern mastery visualizations, target readiness indicators, and Markdown cheat sheet export.",
                "estimated_hours": 7.0,
                "tasks": [
                    { "id": "m4-t1", "text": "Integrate Recharts donut charts displaying solved counts by difficulty (Easy, Medium, Hard)." },
                    { "id": "m4-t2", "text": "Build pattern mastery horizontal bars (Sliding Window, Binary Search, Trees, Graphs, DP)." },
                    { "id": "m4-t3", "text": "Implement Markdown export feature generating printable interview revision cheat sheet." },
                    { "id": "m4-t4", "text": "Perform end-to-end user verification and finalize documentation." }
                ]
            }
        ]
    }
}
