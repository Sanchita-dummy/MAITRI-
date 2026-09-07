"""
MAITRI synthetic mock-data generator.
Generates JSON seed files for all entities, cross-linked by IDs.
All data is 100% synthetic. No real personal information is used.
Run: python generate_mock_data.py   (from inside mock-data/)
"""
import json
import random
import os
from datetime import datetime, timedelta

random.seed(42)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

def save(name, data):
    with open(os.path.join(OUT_DIR, f"{name}.json"), "w") as f:
        json.dump(data, f, indent=2)
    print(f"wrote {name}.json ({len(data)} records)")

# ---------------------------------------------------------------------------
# DEPARTMENTS
# ---------------------------------------------------------------------------
DEPARTMENTS = [
    ("DEPT001", "Ministry of Rural Development", "Rural infrastructure, livelihoods, and welfare schemes"),
    ("DEPT002", "Ministry of Health & Family Welfare", "Public health delivery and disease surveillance"),
    ("DEPT003", "Ministry of Agriculture & Farmers Welfare", "Farm productivity, supply chain, and farmer income"),
    ("DEPT004", "Ministry of Road Transport & Highways", "Road safety, traffic management, and highway infrastructure"),
    ("DEPT005", "Ministry of Power", "Electricity distribution, grid modernization, and renewable integration"),
    ("DEPT006", "Ministry of Environment, Forest & Climate Change", "Pollution monitoring and climate resilience"),
    ("DEPT007", "Ministry of Education", "School education quality and digital learning access"),
    ("DEPT008", "Ministry of Urban Development", "Smart city infrastructure and municipal services"),
    ("DEPT009", "Ministry of Jal Shakti", "Water resource management and sanitation"),
    ("DEPT010", "Ministry of Micro, Small & Medium Enterprises", "MSME credit access and digitization"),
]

departments = [
    {
        "department_id": d[0],
        "name": d[1],
        "description": d[2],
        "sector": d[1].split("Ministry of ")[-1],
        "contact_region": random.choice(["National", "New Delhi HQ"]),
        "synthetic": True,
    }
    for d in DEPARTMENTS
]
save("departments", departments)

# ---------------------------------------------------------------------------
# PROBLEMS (2 per department = 20)
# ---------------------------------------------------------------------------
PROBLEM_TEMPLATES = [
    "Lack of real-time visibility into {topic} across rural blocks",
    "High manual effort and delays in {topic} verification processes",
    "Difficulty predicting {topic} risks before they escalate",
    "Poor last-mile data collection for {topic} monitoring",
    "Fragmented systems causing duplication in {topic} record-keeping",
    "Limited access to affordable {topic} solutions for underserved regions",
]
TOPICS_BY_DEPT = {
    "DEPT001": ["housing scheme beneficiary", "employment guarantee attendance", "rural asset"],
    "DEPT002": ["maternal health tracking", "disease outbreak", "primary health center supply"],
    "DEPT003": ["crop yield", "soil health", "farm-to-market logistics"],
    "DEPT004": ["road accident", "highway pothole", "traffic congestion"],
    "DEPT005": ["electricity distribution loss", "grid outage", "rooftop solar adoption"],
    "DEPT006": ["air quality", "illegal deforestation", "industrial effluent"],
    "DEPT007": ["student learning outcome", "school infrastructure", "teacher attendance"],
    "DEPT008": ["municipal waste collection", "urban flooding", "public transit"],
    "DEPT009": ["groundwater depletion", "water quality contamination", "sewage treatment"],
    "DEPT010": ["MSME loan disbursement", "GST compliance", "export documentation"],
}

problems = []
pid = 1
for dept in departments:
    topics = TOPICS_BY_DEPT[dept["department_id"]]
    for i in range(2):
        topic = topics[i % len(topics)]
        template = random.choice(PROBLEM_TEMPLATES)
        problems.append({
            "problem_id": f"PROB{pid:03d}",
            "department_id": dept["department_id"],
            "title": template.format(topic=topic).capitalize(),
            "description": (
                f"The {dept['name']} faces {template.format(topic=topic)}. "
                f"This impacts service delivery and requires a technology-driven, scalable intervention "
                f"suitable for pan-India or regional deployment."
            ),
            "sector": dept["sector"],
            "priority": random.choice(["HIGH", "MEDIUM", "LOW"]),
            "status": random.choice(["SUBMITTED", "SUBMITTED", "CHALLENGE_GENERATED"]),
            "created_at": (datetime(2025, 1, 1) + timedelta(days=random.randint(0, 240))).isoformat(),
            "synthetic": True,
        })
        pid += 1
save("problems", problems)

# ---------------------------------------------------------------------------
# CHALLENGES (15, derived from a subset of problems)
# ---------------------------------------------------------------------------
challenge_source_problems = random.sample(problems, 15)
CHALLENGE_ASKS = [
    "Build an AI/IoT-based early warning and monitoring system",
    "Develop a mobile-first data collection and verification platform",
    "Create a predictive analytics solution using satellite and sensor data",
    "Design a blockchain or ledger-based transparent tracking system",
    "Build a citizen-facing app with offline-first data sync",
]
challenges = []
for i, prob in enumerate(challenge_source_problems):
    cid = f"CHAL{i+1:03d}"
    ask = random.choice(CHALLENGE_ASKS)
    challenges.append({
        "challenge_id": cid,
        "problem_id": prob["problem_id"],
        "department_id": prob["department_id"],
        "title": f"{ask} for {prob['title'].lower()}",
        "description": (
            f"{ask} that addresses: {prob['description']} "
            f"The solution should be deployable within 6 months, cost-efficient, and interoperable "
            f"with existing government IT systems."
        ),
        "sector": prob["sector"],
        "required_technologies": random.sample(
            ["AI/ML", "IoT", "Satellite Imagery", "Blockchain", "Mobile App", "Cloud Analytics",
             "Computer Vision", "NLP", "GIS Mapping", "Edge Computing"], k=3
        ),
        "budget_range_inr": random.choice(["₹10L - ₹50L", "₹50L - ₹1Cr", "₹1Cr - ₹5Cr"]),
        "timeline_months": random.choice([3, 6, 9, 12]),
        "status": random.choice(["DRAFT", "PUBLISHED", "PUBLISHED", "PUBLISHED"]),
        "ai_generated": True,
        "created_at": (datetime(2025, 2, 1) + timedelta(days=random.randint(0, 200))).isoformat(),
        "synthetic": True,
    })
save("challenges", challenges)

# ---------------------------------------------------------------------------
# STARTUPS (45) - realistic synthetic Indian startup data
# ---------------------------------------------------------------------------
CITY_STATE = [
    ("Bengaluru", "Karnataka"), ("Hyderabad", "Telangana"), ("Pune", "Maharashtra"),
    ("Chennai", "Tamil Nadu"), ("Gurugram", "Haryana"), ("Noida", "Uttar Pradesh"),
    ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"), ("Kochi", "Kerala"),
    ("Indore", "Madhya Pradesh"), ("Bhubaneswar", "Odisha"), ("Chandigarh", "Punjab"),
    ("Coimbatore", "Tamil Nadu"), ("Nagpur", "Maharashtra"), ("Lucknow", "Uttar Pradesh"),
]
SECTORS = ["AgriTech", "HealthTech", "CleanTech", "MobilityTech", "GovTech", "EdTech",
           "WaterTech", "FinTech for MSME", "Climate & Environment", "Smart Infrastructure"]
TECHS = ["AI/ML", "IoT Sensors", "Satellite Imagery", "Computer Vision", "NLP",
         "Blockchain", "Cloud Analytics", "Mobile Apps", "GIS Mapping", "Edge Computing",
         "Drone Imaging", "Predictive Analytics", "AR/VR", "Robotics", "LoRaWAN Networks"]
CAPABILITIES_BY_SECTOR = {
    "AgriTech": ["crop health monitoring", "soil analysis", "yield prediction", "farm-to-market logistics", "pest detection"],
    "HealthTech": ["remote diagnostics", "maternal health tracking", "disease surveillance", "telemedicine", "supply chain for medicines"],
    "CleanTech": ["renewable energy monitoring", "emissions tracking", "waste-to-energy", "solar grid optimization"],
    "MobilityTech": ["traffic prediction", "accident detection", "EV fleet management", "smart parking"],
    "GovTech": ["citizen grievance analytics", "scheme beneficiary verification", "e-governance workflows", "fraud detection"],
    "EdTech": ["learning outcome analytics", "attendance tracking", "vernacular content delivery", "adaptive learning"],
    "WaterTech": ["groundwater monitoring", "water quality testing", "leak detection", "sewage treatment optimization"],
    "FinTech for MSME": ["credit scoring", "GST automation", "invoice financing", "export documentation"],
    "Climate & Environment": ["air quality monitoring", "deforestation detection", "carbon accounting", "flood prediction"],
    "Smart Infrastructure": ["asset monitoring", "predictive maintenance", "smart metering", "waste collection optimization"],
}
PRODUCT_NOUNS = ["Platform", "Suite", "Engine", "Dashboard", "OS", "Hub", "Cloud", "Analytics Stack"]
NAME_PREFIXES = ["Kisan", "Grameen", "Sarvodaya", "Nirmaan", "Prakriti", "Urja", "Setu", "Disha",
                 "Anveshan", "Bhoomi", "Jal", "Sanchar", "Vikas", "Drishti", "Netra", "Aadhar",
                 "Chetna", "Pragati", "Utkarsh", "Sahyog", "Kavach", "Mitra", "Samvad", "Nova",
                 "Tarang", "Vayu", "Agni", "Prithvi", "Akash", "Sagar", "Him", "Ratna", "Suraksha",
                 "Uday", "Kranti", "Shakti", "Deep", "Roshni", "Vistaar", "Aarogya", "Poshan",
                 "Anaaj", "Fasal", "Sinchan", "Vidyut", "Nirikshan"]
NAME_SUFFIXES = ["Tech", "Labs", "Systems", "AI", "Innovations", "Networks", "Dynamics", "Solutions"]

TRL_LEVELS = list(range(3, 10))
FUNDING_STAGES = ["Bootstrapped", "Pre-Seed", "Seed", "Series A", "Series B", "Growth"]
CERTS = ["ISO 27001", "ISO 9001", "STQC Certified", "CERT-In Empanelled", "MeitY Startup Hub Recognized",
         "GeM Registered", "DPIIT Recognized", "SOC 2 Type II"]

startups = []
used_names = set()
NUM_STARTUPS = 46
for i in range(NUM_STARTUPS):
    while True:
        name = f"{random.choice(NAME_PREFIXES)}{random.choice(NAME_SUFFIXES)}"
        if name not in used_names:
            used_names.add(name)
            break
    sector = SECTORS[i % len(SECTORS)] if i < len(SECTORS) else random.choice(SECTORS)
    secondary_sector = random.choice([s for s in SECTORS if s != sector])
    city, state = random.choice(CITY_STATE)
    caps_pool = CAPABILITIES_BY_SECTOR[sector] + random.sample(
        CAPABILITIES_BY_SECTOR[secondary_sector], k=min(2, len(CAPABILITIES_BY_SECTOR[secondary_sector]))
    )
    capabilities = random.sample(caps_pool, k=min(len(caps_pool), random.randint(3, 5)))
    technologies = random.sample(TECHS, k=random.randint(3, 5))
    trl = random.choice(TRL_LEVELS)
    team_size = random.choice([5, 8, 12, 15, 20, 30, 45, 60, 90, 120])
    prev_pilots = random.randint(0, 6)
    govt_experience = prev_pilots > 0 or random.random() < 0.3
    startups.append({
        "startup_id": f"STU{i+1:03d}",
        "company_name": f"{name} Pvt Ltd",
        "description": (
            f"{name} builds {random.choice(technologies)}-powered solutions for the {sector.lower()} sector, "
            f"focused on {', '.join(capabilities[:2])}. Headquartered in {city}, the team has deployed "
            f"solutions across {random.randint(2, 15)} Indian states."
        ),
        "sectors": [sector, secondary_sector],
        "technologies": technologies,
        "capabilities": capabilities,
        "products": [f"{name} {random.choice(PRODUCT_NOUNS)}"],
        "trl_level": trl,
        "headquarters": f"{city}, {state}",
        "operating_regions": random.sample(
            [s for _, s in CITY_STATE], k=random.randint(2, 6)
        ),
        "team_size": team_size,
        "previous_pilots": prev_pilots,
        "government_experience": govt_experience,
        "certifications": random.sample(CERTS, k=random.randint(0, 3)),
        "deployment_capacity": random.choice(["Pilot only (1-2 sites)", "Regional (state-level)", "Pan-India"]),
        "funding_stage": random.choice(FUNDING_STAGES),
        "founded_year": random.randint(2015, 2023),
        "synthetic": True,
    })
save("startups", startups)

# ---------------------------------------------------------------------------
# POLICIES (15)
# ---------------------------------------------------------------------------
POLICY_TOPICS = [
    ("Public Procurement of Innovation", "Guidelines for government departments to procure innovative solutions from startups outside standard L1 tendering, using pilot-first and outcome-based contracts."),
    ("Startup India Eligibility Framework", "Defines criteria for an entity to be recognized as a startup, including incorporation age, turnover limits, and innovation criteria."),
    ("AI Governance Principles", "Principles for responsible AI deployment in government systems including explainability, human oversight, and bias mitigation."),
    ("Data Localization & Handling Guidelines", "Requirements for storage of citizen data within national boundaries and encryption standards for sensitive data."),
    ("Cybersecurity Baseline for GovTech Vendors", "Minimum security controls (e.g., ISO 27001 or CERT-In empanelment) required for vendors handling government data."),
    ("Pilot Evaluation Framework", "Standard framework for evaluating pilot success including KPI baselining, achievement thresholds, and scale-readiness criteria."),
    ("Accessibility Standards for Digital Government Services", "Requirements for WCAG 2.1 AA compliance and multi-lingual access in citizen-facing digital services."),
    ("Sustainability & ESG Guidelines for Public Contracts", "Environmental and social governance expectations for vendors delivering infrastructure or climate-related solutions."),
    ("GeM Registration Requirements", "Process and eligibility for startups to list products/services on the Government e-Marketplace."),
    ("TRL-Based Procurement Readiness", "Guidelines mapping Technology Readiness Level to appropriate procurement/pilot pathways."),
    ("Data Privacy for Citizen Health Records", "Handling requirements for health data collected during HealthTech pilots, aligned with the Digital Personal Data Protection framework."),
    ("MSME & Startup Credit Facilitation Policy", "Framework for facilitating working capital access to startups engaged in government pilots."),
    ("Rural Deployment Incentive Scheme", "Incentives for startups deploying solutions in Tier-3/Tier-4 towns and rural blocks."),
    ("Open Government Data Usage Policy", "Terms under which startups may use open government datasets for building solutions."),
    ("Innovation Challenge Design Guidelines", "Best practices for departments framing problem statements as innovation challenges."),
]
policies = []
for i, (title, desc) in enumerate(POLICY_TOPICS):
    policies.append({
        "policy_id": f"POL{i+1:03d}",
        "title": title,
        "description": desc,
        "category": random.choice(["Procurement", "Governance", "Data & Security", "Sustainability", "Eligibility"]),
        "applies_to_sectors": random.sample(SECTORS, k=random.randint(1, 3)),
        "synthetic": True,
        "note": "This is a synthetic policy created for prototype purposes and does not represent an actual government policy.",
    })
save("policies", policies)

# ---------------------------------------------------------------------------
# ELIGIBILITY RULES (20)
# ---------------------------------------------------------------------------
eligibility_rules = []
rule_id = 1
RULE_DEFS = [
    ("min_trl", "Minimum TRL Level", lambda: random.choice([3, 4, 5, 6])),
    ("certification_required", "Required Certification", lambda: random.choice(CERTS)),
    ("government_experience", "Prior Government Experience Required", lambda: random.choice([True, False])),
    ("min_deployment_capacity", "Minimum Deployment Capacity", lambda: random.choice(["Pilot only (1-2 sites)", "Regional (state-level)"])),
    ("sector_match", "Sector Compatibility Required", lambda: True),
]
for chal in challenges:
    for rule_type, label, valgen in random.sample(RULE_DEFS, k=random.randint(2, 3)):
        eligibility_rules.append({
            "rule_id": f"RULE{rule_id:03d}",
            "challenge_id": chal["challenge_id"],
            "rule_type": rule_type,
            "label": label,
            "required_value": valgen(),
            "synthetic": True,
        })
        rule_id += 1
        if len(eligibility_rules) >= 22:
            break
    if len(eligibility_rules) >= 22:
        break
save("eligibility_rules", eligibility_rules[:22])

# ---------------------------------------------------------------------------
# APPLICATIONS (30) - startup applies to challenge
# ---------------------------------------------------------------------------
published_challenges = [c for c in challenges if c["status"] == "PUBLISHED"]
applications = []
for i in range(30):
    chal = random.choice(published_challenges if published_challenges else challenges)
    stu = random.choice(startups)
    applications.append({
        "application_id": f"APP{i+1:03d}",
        "challenge_id": chal["challenge_id"],
        "startup_id": stu["startup_id"],
        "status": random.choice(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
        "match_score": round(random.uniform(35, 97), 1),
        "submitted_at": (datetime(2025, 3, 1) + timedelta(days=random.randint(0, 150))).isoformat(),
        "synthetic": True,
    })
save("applications", applications)

# ---------------------------------------------------------------------------
# EVALUATIONS (20) - AI evaluation for a subset of applications
# ---------------------------------------------------------------------------
eval_apps = random.sample(applications, k=min(20, len(applications)))
evaluations = []
for i, app in enumerate(eval_apps):
    dims = {
        "technical_feasibility": random.randint(50, 100),
        "expected_impact": random.randint(50, 100),
        "pilot_readiness": random.randint(40, 100),
        "scalability": random.randint(40, 100),
        "security": random.randint(50, 100),
        "cost_efficiency": random.randint(40, 100),
    }
    total = round(sum(dims.values()) / len(dims), 1)
    evaluations.append({
        "evaluation_id": f"EVAL{i+1:03d}",
        "application_id": app["application_id"],
        "scores": dims,
        "total_score": total,
        "recommendation": "APPROVE" if total >= 70 else ("REVIEW" if total >= 55 else "REJECT"),
        "reasoning": None,  # filled by Groq at generation time in the app
        "evaluated_at": (datetime(2025, 4, 1) + timedelta(days=random.randint(0, 100))).isoformat(),
        "synthetic": True,
    })
save("evaluations", evaluations)

# ---------------------------------------------------------------------------
# PILOTS (10) - created from approved applications
# ---------------------------------------------------------------------------
approved_like = [a for a in applications if a["status"] == "APPROVED"] or random.sample(applications, 10)
pilot_source = (approved_like * 3)[:10]
pilots = []
LOCATIONS = ["Nashik, Maharashtra", "Kurnool, Andhra Pradesh", "Sikar, Rajasthan", "Bastar, Chhattisgarh",
             "Dhenkanal, Odisha", "Ballari, Karnataka", "Sitapur, Uttar Pradesh", "Tirunelveli, Tamil Nadu",
             "Kutch, Gujarat", "Rewa, Madhya Pradesh"]
for i, app in enumerate(pilot_source):
    chal = next(c for c in challenges if c["challenge_id"] == app["challenge_id"])
    status = random.choice(["PLANNED", "ACTIVE", "COMPLETED", "COMPLETED", "SCALED", "FAILED"])
    pilots.append({
        "pilot_id": f"PIL{i+1:03d}",
        "application_id": app["application_id"],
        "startup_id": app["startup_id"],
        "challenge_id": chal["challenge_id"],
        "department_id": chal["department_id"],
        "location": LOCATIONS[i % len(LOCATIONS)],
        "duration_months": random.choice([3, 6, 9]),
        "milestones": [
            {"title": "Deployment & onboarding", "done": True},
            {"title": "Mid-pilot review", "done": status != "PLANNED"},
            {"title": "Final KPI assessment", "done": status in ["COMPLETED", "SCALED", "FAILED"]},
        ],
        "status": status,
        "start_date": (datetime(2025, 5, 1) + timedelta(days=random.randint(0, 90))).isoformat(),
        "synthetic": True,
    })
save("pilots", pilots)

# ---------------------------------------------------------------------------
# KPIs (30+) - 3 per pilot
# ---------------------------------------------------------------------------
KPI_METRICS = [
    ("Beneficiary coverage", "% of target population reached", "%"),
    ("Processing time reduction", "reduction in average processing time", "%"),
    ("Cost savings", "reduction in operational cost", "%"),
    ("Data accuracy improvement", "improvement in data accuracy", "%"),
    ("User adoption rate", "active users out of registered users", "%"),
    ("Response time", "average system response time", "hours"),
    ("Detection accuracy", "accuracy of AI detection/prediction", "%"),
]
kpis = []
kid = 1
for pilot in pilots:
    for metric_name, metric_desc, unit in random.sample(KPI_METRICS, k=3):
        baseline = round(random.uniform(10, 50), 1)
        target = round(baseline + random.uniform(20, 50), 1)
        if pilot["status"] in ["COMPLETED", "SCALED", "FAILED"]:
            actual = round(baseline + random.uniform(-5, 55), 1)
        else:
            actual = round(baseline + random.uniform(0, 20), 1)
        achievement_pct = round(max(0, (actual - baseline) / (target - baseline) * 100), 1) if target != baseline else 0.0
        status = "MET" if achievement_pct >= 100 else ("ON_TRACK" if achievement_pct >= 60 else "AT_RISK")
        kpis.append({
            "kpi_id": f"KPI{kid:03d}",
            "pilot_id": pilot["pilot_id"],
            "metric": metric_name,
            "metric_description": metric_desc,
            "baseline": baseline,
            "target": target,
            "actual": actual,
            "unit": unit,
            "achievement_percentage": achievement_pct,
            "status": status,
            "synthetic": True,
        })
        kid += 1
save("kpis", kpis)

# ---------------------------------------------------------------------------
# KNOWLEDGE DOCUMENTS (30) - for RAG / ChromaDB, one per policy + extra guidance docs
# ---------------------------------------------------------------------------
knowledge_documents = []
kdid = 1
for pol in policies:
    knowledge_documents.append({
        "doc_id": f"KDOC{kdid:03d}",
        "title": pol["title"],
        "category": pol["category"],
        "content": (
            f"{pol['title']}: {pol['description']} This guideline applies primarily to the "
            f"{', '.join(pol['applies_to_sectors'])} sector(s). Departments and startups engaging in "
            f"innovation pilots should reference this guidance when structuring procurement, evaluation, "
            f"or deployment activities. Note: this is illustrative synthetic guidance for a hackathon "
            f"prototype and does not represent binding government policy."
        ),
        "source_policy_id": pol["policy_id"],
        "synthetic": True,
    })
    kdid += 1

EXTRA_DOCS = [
    ("Understanding Technology Readiness Levels (TRL)", "Eligibility",
     "TRL is a 1-9 scale describing the maturity of a technology, from basic principles observed (TRL 1) "
     "to actual system proven in operational environment (TRL 9). Government pilots typically require TRL 4-6 "
     "for pilot-stage deployment and TRL 7+ for direct procurement."),
    ("Cybersecurity Requirements Overview for GovTech Pilots", "Data & Security",
     "Startups handling citizen or government data should maintain baseline controls: encryption at rest and "
     "in transit, role-based access control, audit logging, and periodic vulnerability assessments. "
     "CERT-In empanelment or ISO 27001 certification is recommended for higher-sensitivity workloads."),
    ("Data Handling Guidelines for Pilot Programs", "Data & Security",
     "Personal or sensitive data collected during pilots must be minimized, anonymized where possible, "
     "stored within approved data centers, and deleted per a defined retention schedule after pilot conclusion."),
    ("Accessibility Requirements for Citizen-Facing Applications", "Governance",
     "Citizen-facing digital services should support screen readers, provide multi-lingual interfaces "
     "(including regional languages), and maintain WCAG 2.1 AA compliance for visual and motor accessibility."),
    ("Sustainability Requirements for Infrastructure Pilots", "Sustainability",
     "Pilots involving physical infrastructure or hardware deployment should account for energy efficiency, "
     "e-waste disposal plans, and, where applicable, use of renewable power sources."),
    ("Public Procurement of Innovation: Pilot-First Approach", "Procurement",
     "Rather than full-scale tendering, departments may run time-boxed pilots (typically 3-6 months) with "
     "pre-agreed KPIs before committing to a scaled procurement contract, reducing risk for both parties."),
    ("Eligibility Screening: Government Experience Weighting", "Eligibility",
     "Prior government pilot experience is a positive but not mandatory signal. First-time vendors may still "
     "qualify if they meet TRL, certification, and deployment capacity thresholds."),
    ("AI Explainability Requirements for Public Sector Use", "Governance",
     "AI systems used in citizen-impacting decisions should provide human-readable justifications for scores "
     "or recommendations, and allow for human review before final action is taken."),
    ("Vendor Certification Pathways", "Data & Security",
     "Startups without existing certifications may pursue STQC testing or CERT-In empanelment during the "
     "pilot phase, with full certification required before scale-up."),
    ("Scale Recommendation Criteria", "Procurement",
     "A pilot is generally recommended for SCALE when KPI achievement exceeds 80% on primary metrics, for "
     "ITERATE when between 50-80%, and STOP when below 50% with no clear remediation path."),
    ("Sector Compatibility Guidelines for Matching", "Eligibility",
     "Startups should be matched to challenges within their declared primary or secondary sector to ensure "
     "domain expertise, though cross-sector technology transfer (e.g., AgriTech sensors applied to WaterTech) "
     "is permitted with justification."),
    ("Regional Deployment Considerations", "Procurement",
     "Startups with only pilot-scale deployment capacity should be paired with single-district challenges, "
     "while pan-India capable startups may be considered for multi-state rollouts."),
    ("Data Retention and Deletion Guidelines", "Data & Security",
     "Pilot data should be retained only for the duration necessary for evaluation and audit, typically not "
     "exceeding 12 months post-pilot-conclusion unless required for a scaled deployment."),
    ("Innovation Challenge Publication Standards", "Governance",
     "Published challenges should clearly state the problem, required technologies, budget range, and "
     "timeline to ensure startups can self-assess fit before applying."),
    ("KPI Baselining Methodology", "Procurement",
     "Baselines should be measured using pre-pilot data over a comparable time period; achievement percentage "
     "is calculated as (actual - baseline) / (target - baseline) * 100."),
]
for title, cat, content in EXTRA_DOCS:
    knowledge_documents.append({
        "doc_id": f"KDOC{kdid:03d}",
        "title": title,
        "category": cat,
        "content": content,
        "source_policy_id": None,
        "synthetic": True,
    })
    kdid += 1
save("knowledge_documents", knowledge_documents)

print("\nAll mock data generated successfully.")
print(f"Departments: {len(departments)} | Problems: {len(problems)} | Challenges: {len(challenges)}")
print(f"Startups: {len(startups)} | Policies: {len(policies)} | Eligibility Rules: {len(eligibility_rules[:22])}")
print(f"Applications: {len(applications)} | Evaluations: {len(evaluations)} | Pilots: {len(pilots)} | KPIs: {len(kpis)}")
print(f"Knowledge Documents: {len(knowledge_documents)}")
