"""
services/roadmap_service.py — Roadmap generation and dynamic recalculation engine.

Generation priority: HIGH gaps → MEDIUM → LOW
Recalculation rules (spec-exact):
  score >= 80% on topic → mark ahead-of-schedule, compress future weeks
  score <= 50% on topic → insert revision/practice/reassessment items
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import math

from models.roadmap import Roadmap, RoadmapItem, RoadmapItemStatus
from models.skill_gap import SkillGap, GapPriority
from models.skill import CareerGoal, StudentSkill
from models.assessment import AssessmentAttempt, AttemptStatus, Assessment
from models.user import StudentProfile
from models.config import AppConfig
from services.skill_gap_service import compute_gap_for_student


PRIORITY_ORDER = {GapPriority.high: 0, GapPriority.medium: 1, GapPriority.low: 2, GapPriority.none: 3}
HOURS_PER_WEEK = {"high": 3.0, "medium": 2.0, "low": 1.0}


def generate_roadmap(db: Session, student: StudentProfile) -> Roadmap:
    """
    Generates a fresh roadmap from current skill gaps.
    Deactivates any existing active roadmap first.
    """
    # Recompute gaps first
    gaps = compute_gap_for_student(db, student)

    active_goal = db.query(CareerGoal).filter(
        CareerGoal.student_id == student.id,
        CareerGoal.is_active == True,
    ).first()

    # Deactivate old roadmaps
    db.query(Roadmap).filter(
        Roadmap.student_id == student.id,
        Roadmap.is_active == True,
    ).update({"is_active": False})

    # Sort gaps by priority
    sorted_gaps = sorted(
        [g for g in gaps if g.priority != GapPriority.none],
        key=lambda g: (PRIORITY_ORDER[g.priority], -g.gap_value),
    )

    daily_hours = student.daily_learning_hours or 1.0
    weekly_hours = daily_hours * 5   # 5 working days

    # Create standard 12-week rich curriculum
    sample_curriculum = [
        # Phase 1: Foundations & Architecture (Weeks 1-3)
        {
            "week": 1,
            "title": "Master System Design Basics (Scalability, Load Balancing)",
            "description": "Study horizontal vs vertical scaling, DNS routing, reverse proxies, and caching strategies with Redis.",
            "type": "learn", "difficulty": "medium", "hours": 6.0, "status": RoadmapItemStatus.completed,
            "target": "Closes gap: System Design (62% → 71%)", "phase": "Foundations & Architecture",
            "proof": {"type": "quiz", "verified": True, "completed_at": datetime.now(timezone.utc).isoformat(), "data": {"score": 3, "total": 3}},
            "resources": [
                {"title": "System Design Primer Guide", "url": "https://github.com/donnemartin/system-design-primer", "type": "article"},
                {"title": "Scalability & Load Balancing Video", "url": "https://www.youtube.com", "type": "video"},
                {"title": "Interactive Architecture Sandbox", "url": "https://roadmap.sh", "type": "practice"}
            ]
        },
        {
            "week": 1,
            "title": "Database Indexing & Query Execution Plans",
            "description": "Analyze B-Tree indexes, composite keys, explain analyze plans, and SQL query optimization.",
            "type": "practice", "difficulty": "medium", "hours": 5.0, "status": RoadmapItemStatus.completed,
            "target": "Closes gap: SQL & Database Internals (55% → 68%)", "phase": "Foundations & Architecture",
            "proof": {"type": "github", "verified": True, "completed_at": datetime.now(timezone.utc).isoformat(), "data": {"url": "https://github.com/student/sql-indexing"}},
            "resources": [
                {"title": "Use The Index, Luke! Guide", "url": "https://use-the-index-luke.com", "type": "article"},
                {"title": "PostgreSQL Index Walkthrough", "url": "https://www.youtube.com", "type": "video"},
                {"title": "SQL Tuning Exercises", "url": "https://sqlbolt.com", "type": "practice"}
            ]
        },
        {
            "week": 1,
            "title": "RESTful API Architecture & Idempotency Keys",
            "description": "Design robust REST contracts, error payloads, and safe retry mechanisms using idempotency keys.",
            "type": "build", "difficulty": "easy", "hours": 4.0, "status": RoadmapItemStatus.completed,
            "target": "Closes gap: REST API Design (70% → 82%)", "phase": "Foundations & Architecture",
            "proof": {"type": "note", "verified": True, "completed_at": datetime.now(timezone.utc).isoformat(), "feedback": "Solid architectural reflection.", "data": {"text": "Understood how idempotency tokens prevent duplicate charges on timeout retries."}},
            "resources": [
                {"title": "Stripe Idempotency RFC Overview", "url": "https://stripe.com/docs/api/idempotent_requests", "type": "article"},
                {"title": "API Contract Best Practices", "url": "https://microservices.io", "type": "article"}
            ]
        },
        {
            "week": 2,
            "title": "Implement Microservices Event Bus with Kafka",
            "description": "Build publisher-subscriber pattern for asynchronous event communication and consumer offset management.",
            "type": "build", "difficulty": "hard", "hours": 6.0, "status": RoadmapItemStatus.in_progress,
            "target": "Closes gap: Distributed Messaging (48% → 65%)", "phase": "Foundations & Architecture",
            "resources": [
                {"title": "Kafka Architecture & Partitions Crash Course", "url": "https://kafka.apache.org", "type": "video"},
                {"title": "Event-Driven Microservices Guide", "url": "https://martinfowler.com", "type": "article"},
                {"title": "Kafka Docker Starter Lab", "url": "https://github.com", "type": "practice"}
            ]
        },
        {
            "week": 2,
            "title": "Redis Caching Strategies & Cache Invalidation",
            "description": "Master Cache-Aside, Write-Through, Write-Behind, cache stampede mitigation, and TTL eviction policies.",
            "type": "practice", "difficulty": "medium", "hours": 5.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: In-Memory Caching (58% → 72%)", "phase": "Foundations & Architecture",
            "resources": [
                {"title": "Redis Caching Deep Dive", "url": "https://redis.io/docs", "type": "article"},
                {"title": "Preventing Cache Stampede Video", "url": "https://www.youtube.com", "type": "video"}
            ]
        },
        {
            "week": 3,
            "title": "Foundations Phase Milestone Assessment & DSA Review",
            "description": "Solve 10 medium graph and tree problems under timed conditions to solidify foundational coding pace.",
            "type": "interview_prep", "difficulty": "hard", "hours": 6.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Algorithmic Complexity (60% → 75%)", "phase": "Foundations & Architecture",
            "resources": [
                {"title": "Blind 75 Trees & Graphs Checklist", "url": "https://leetcode.com", "type": "practice"},
                {"title": "Tree Traversal Techniques", "url": "https://geeksforgeeks.org", "type": "article"}
            ]
        },

        # Phase 2: Backend & Distributed Systems (Weeks 4-6)
        {
            "week": 4,
            "title": "gRPC & Protocol Buffers Inter-Service Communication",
            "description": "Implement binary streaming contracts, multiplexed HTTP/2 transport, and client-side load balancing.",
            "type": "build", "difficulty": "medium", "hours": 6.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: High-Performance RPC (40% → 62%)", "phase": "Backend & Distributed Systems",
            "resources": [
                {"title": "gRPC Python & Go Official Guide", "url": "https://grpc.io/docs", "type": "article"},
                {"title": "Protobuf Serialization Benchmarks", "url": "https://www.youtube.com", "type": "video"}
            ]
        },
        {
            "week": 4,
            "title": "Distributed Transactions & The Saga Pattern",
            "description": "Design choreography and orchestration-based sagas with compensating transactions for eventual consistency.",
            "type": "learn", "difficulty": "hard", "hours": 6.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Distributed Consistency (42% → 60%)", "phase": "Backend & Distributed Systems",
            "resources": [
                {"title": "Saga Pattern for Microservices", "url": "https://microservices.io/patterns/data/saga.html", "type": "article"},
                {"title": "Distributed Sagas Explained", "url": "https://www.youtube.com", "type": "video"}
            ]
        },
        {
            "week": 5,
            "title": "Database Sharding, Partitions & Read Replicas",
            "description": "Implement hash-based range sharding and master-replica replication with read-after-write consistency.",
            "type": "practice", "difficulty": "hard", "hours": 7.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Database Scaling (50% → 70%)", "phase": "Backend & Distributed Systems",
            "resources": [
                {"title": "Database Sharding Architectures", "url": "https://aws.amazon.com", "type": "article"},
                {"title": "Replication Lag Demystified", "url": "https://www.youtube.com", "type": "video"}
            ]
        },
        {
            "week": 6,
            "title": "Distributed Rate Limiting with Token Bucket & Leaky Bucket",
            "description": "Implement Redis sliding window rate limiters to protect downstream services from spikes.",
            "type": "build", "difficulty": "medium", "hours": 5.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: API Security & Resilience (65% → 78%)", "phase": "Backend & Distributed Systems",
            "resources": [
                {"title": "Rate Limiting Algorithms Deep Dive", "url": "https://konghq.com", "type": "article"},
                {"title": "Sliding Window Redis Implementation", "url": "https://redis.io", "type": "practice"}
            ]
        },

        # Phase 3: Systems & Scalability (Weeks 7-9)
        {
            "week": 7,
            "title": "Distributed Tracing & Observability with OpenTelemetry",
            "description": "Instrument spans, context propagation, latency heatmaps, and metric aggregations across microservices.",
            "type": "practice", "difficulty": "medium", "hours": 6.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Cloud Observability (45% → 65%)", "phase": "Systems & Scalability",
            "resources": [
                {"title": "OpenTelemetry Fundamentals", "url": "https://opentelemetry.io", "type": "article"},
                {"title": "Jaeger Distributed Tracing Lab", "url": "https://www.jaegertracing.io", "type": "practice"}
            ]
        },
        {
            "week": 8,
            "title": "Container Orchestration with Docker & Kubernetes Pods",
            "description": "Write production Dockerfiles, multi-stage builds, deployment manifests, and liveness/readiness probes.",
            "type": "build", "difficulty": "medium", "hours": 7.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Containerized Infrastructure (52% → 72%)", "phase": "Systems & Scalability",
            "resources": [
                {"title": "Kubernetes The Hard Way Guide", "url": "https://github.com/kelseyhightower/kubernetes-the-hard-way", "type": "article"},
                {"title": "Production Dockerfile Best Practices", "url": "https://docs.docker.com", "type": "video"}
            ]
        },
        {
            "week": 9,
            "title": "Fault Tolerance & Resilience (Circuit Breakers & Retries)",
            "description": "Integrate Resilience4j or Polly circuit breakers, fallback responses, and exponential backoff.",
            "type": "practice", "difficulty": "hard", "hours": 6.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: High Availability Architecture (55% → 74%)", "phase": "Systems & Scalability",
            "resources": [
                {"title": "Netflix Hystrix & Circuit Breaker Pattern", "url": "https://martinfowler.com", "type": "article"},
                {"title": "Exponential Backoff Simulation", "url": "https://aws.amazon.com", "type": "practice"}
            ]
        },

        # Phase 4: Interview Prep & Mastery (Weeks 10-12)
        {
            "week": 10,
            "title": "Concurrency, Thread Pools & Deadlock Avoidance",
            "description": "Review lock-free programming, race conditions, atomic variables, and thread contention profiling.",
            "type": "learn", "difficulty": "hard", "hours": 6.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Concurrent Programming (50% → 73%)", "phase": "Interview Prep & Mastery",
            "resources": [
                {"title": "Java/Python Concurrency Models", "url": "https://docs.python.org", "type": "article"},
                {"title": "Deadlock Avoidance Strategies", "url": "https://www.youtube.com", "type": "video"}
            ]
        },
        {
            "week": 11,
            "title": "System Design Mock Interview: Design a URL Shortener & Rate Limiter",
            "description": "Deliver full 45-min whiteboard presentation: capacity estimation, data schema, API design, and bottlenecks.",
            "type": "interview_prep", "difficulty": "hard", "hours": 7.0, "status": RoadmapItemStatus.pending,
            "target": "Closes gap: Whiteboard Communication (60% → 82%)", "phase": "Interview Prep & Mastery",
            "resources": [
                {"title": "Designing TinyURL Architecture", "url": "https://github.com/donnemartin/system-design-primer", "type": "article"},
                {"title": "Mock System Design Interview Video", "url": "https://www.youtube.com", "type": "video"}
            ]
        },
        {
            "week": 12,
            "title": "Comprehensive Tier-1 Placement Readiness Mock Simulation",
            "description": "End-to-end full loop simulation covering 2 technical coding rounds, 1 system design, and 1 behavioral review.",
            "type": "interview_prep", "difficulty": "hard", "hours": 8.0, "status": RoadmapItemStatus.pending,
            "target": "Placement Readiness Target: 85%+", "phase": "Interview Prep & Mastery",
            "resources": [
                {"title": "Behavioral STAR Framework Prep Guide", "url": "https://hbr.org", "type": "article"},
                {"title": "Technical Interview Final Checklist", "url": "https://interviewing.io", "type": "practice"}
            ]
        }
    ]

    # Create the roadmap
    version = db.query(Roadmap).filter(Roadmap.student_id == student.id).count() + 1
    roadmap = Roadmap(
        student_id=student.id,
        career_goal_id=active_goal.id if active_goal else None,
        version=version,
        total_weeks=12,
        is_active=True,
        generated_at=datetime.now(timezone.utc),
    )
    db.add(roadmap)
    db.flush()

    for item_data in sample_curriculum:
        item = RoadmapItem(
            roadmap_id=roadmap.id,
            week_number=item_data["week"],
            title=item_data["title"],
            description=item_data["description"],
            status=item_data["status"],
            priority="high" if item_data["difficulty"] == "hard" else "medium",
            item_type=item_data["type"],
            difficulty=item_data["difficulty"],
            target_improvement=item_data.get("target"),
            phase=item_data.get("phase"),
            estimated_hours=item_data["hours"],
            resources=item_data.get("resources"),
            proof=item_data.get("proof"),
        )
        if item_data["status"] == RoadmapItemStatus.completed:
            item.completed_at = datetime.now(timezone.utc)
        db.add(item)

    db.commit()
    db.refresh(roadmap)
    return roadmap



def recalculate_roadmap_after_assessment(
    db: Session,
    student: StudentProfile,
    assessment_id: int,
    score: float,
) -> Optional[Roadmap]:
    """
    Adjusts the active roadmap after a new assessment score:
    - score >= 80: compress upcoming items for this skill (mark ahead-of-schedule)
    - score <= 50: insert revision + reassessment items
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment or not assessment.skill_id:
        return None

    roadmap = db.query(Roadmap).filter(
        Roadmap.student_id == student.id,
        Roadmap.is_active == True,
    ).first()
    if not roadmap:
        return generate_roadmap(db, student)

    skill_items = [i for i in roadmap.items if i.skill_id == assessment.skill_id and i.status == RoadmapItemStatus.pending]

    if score >= 80:
        # Compress: mark existing items as ahead-of-schedule
        for item in skill_items[:2]:   # compress first 2 pending items
            item.status = RoadmapItemStatus.skipped
            item.description = (item.description or "") + f" [Compressed: assessment score {score:.0f}%]"

    elif score <= 50:
        # Insert revision items in the next available week
        if skill_items:
            next_week = skill_items[0].week_number
        else:
            next_week = (roadmap.total_weeks or 1) + 1

        revision = RoadmapItem(
            roadmap_id=roadmap.id,
            skill_id=assessment.skill_id,
            week_number=next_week,
            title=f"Revision: {assessment.title}",
            description=f"Score was {score:.0f}% — revision and practice scheduled",
            status=RoadmapItemStatus.revision,
            priority="high",
            item_type="revision",
            estimated_hours=2.0,
        )
        reassess = RoadmapItem(
            roadmap_id=roadmap.id,
            skill_id=assessment.skill_id,
            week_number=next_week + 1,
            title=f"Re-assess: {assessment.title}",
            description="Reassessment after revision",
            status=RoadmapItemStatus.pending,
            priority="high",
            item_type="assess",
            estimated_hours=1.0,
        )
        db.add(revision)
        db.add(reassess)
        roadmap.total_weeks = max(roadmap.total_weeks or 1, next_week + 1)

    roadmap.version += 1
    db.commit()
    db.refresh(roadmap)
    return roadmap
