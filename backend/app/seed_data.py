"""
Comprehensive seed script: Populates the database with realistic test data.
Run: python -m app.seed_data          (idempotent — skips existing)
Run: python -m app.seed_data --reset  (clears all data first, keeps admin)
Prerequisites: Super Admin must already exist (run initial_data first).
"""

import asyncio
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.crm import (
    Client,
    Lead,
    LeadStatus,
    PropertyStatus,
    PropertyType,
    SiteVisitAvailability,
)
from app.models.finance import (
    ProjectWallet,
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.inventory import (
    Item,
    POItem,
    POStatus,
    PurchaseOrder,
    StockTransaction,
    StockTransactionType,
    Vendor,
    VendorItem,
)
from app.models.labor import (
    AttendanceLog,
    AttendanceStatus,
    LaborTeam,
    PaymentModel,
    SkillLevel,
    Specialization,
    Worker,
)
from app.models.notification import Notification, NotificationType
from app.models.project import (
    DailyLog,
    Project,
    ProjectStatus,
    Sprint,
    SprintStatus,
    VariationOrder,
    VOStatus,
)
from app.models.organization import OrgMembership, Organization, PlanTier
from app.models.quotation import QuoteItem, QuoteRoom, QuoteStatus, Quotation
from app.models.user import User, UserRole

# Default org UUID — must match the migration script
DEFAULT_ORG_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")


# ── Reset ────────────────────────────────────────────────────────────────────

TABLES_IN_DELETE_ORDER = [
    "notifications",
    "attendance_logs",
    "workers",
    "labor_teams",
    "daily_logs",
    "transactions",
    "project_wallets",
    "variation_orders",
    "sprints",
    "stock_transactions",
    "po_items",
    "purchase_orders",
    "vendor_items",
    "projects",
    "clients",
    "quote_items",
    "quote_rooms",
    "quotations",
    "leads",
    "vendors",
    "items",
    "org_memberships",
    "users",
    "organizations",
]


async def reset_all(db):
    """Delete all data except the Super Admin user and default org."""
    print("  Clearing all tables (keeping Super Admin & default org)...")
    for table in TABLES_IN_DELETE_ORDER:
        if table == "users":
            await db.execute(
                text("DELETE FROM users WHERE email != 'admin@intdesignerp.com'")
            )
        elif table == "organizations":
            await db.execute(
                text(f"DELETE FROM organizations WHERE id != '{DEFAULT_ORG_ID}'")
            )
        elif table == "org_memberships":
            admin_result = await db.execute(
                text("SELECT id FROM users WHERE email = 'admin@intdesignerp.com'")
            )
            admin_row = admin_result.first()
            if admin_row:
                await db.execute(
                    text(
                        f"DELETE FROM org_memberships WHERE user_id != '{admin_row[0]}'"
                    )
                )
            else:
                await db.execute(text(f"DELETE FROM {table}"))
        else:
            await db.execute(text(f"DELETE FROM {table}"))
    await db.flush()
    print("  All data cleared.")


# ── Helpers ──────────────────────────────────────────────────────────────────


def uid() -> uuid.UUID:
    return uuid.uuid4()


def d(s: str) -> Decimal:
    return Decimal(s)


def today() -> date:
    return date.today()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── 0. Organization ──────────────────────────────────────────────────────────


async def seed_organization(db):
    """Ensure default org exists and admin user is a platform admin with membership."""
    result = await db.execute(
        select(Organization).where(Organization.id == DEFAULT_ORG_ID)
    )
    org = result.scalar_one_or_none()
    if not org:
        org = Organization(
            id=DEFAULT_ORG_ID,
            name="Default Organization",
            slug="default",
            is_active=True,
            plan_tier=PlanTier.PRO,
        )
        db.add(org)
        await db.flush()
        print("  Created default organization")
    else:
        print("  Default organization already exists. Skipping.")

    # Ensure admin is a platform admin with membership
    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one_or_none()
    if admin:
        if not admin.is_platform_admin:
            admin.is_platform_admin = True
            await db.flush()
            print("  Marked admin as platform admin")

        # Ensure membership exists
        mem_result = await db.execute(
            select(OrgMembership).where(
                OrgMembership.user_id == admin.id,
                OrgMembership.org_id == DEFAULT_ORG_ID,
            )
        )
        if not mem_result.scalar_one_or_none():
            mem = OrgMembership(
                user_id=admin.id,
                org_id=DEFAULT_ORG_ID,
                role=UserRole.SUPER_ADMIN,
                is_default=True,
                is_active=True,
            )
            db.add(mem)
            await db.flush()
            print("  Created admin org membership")

    return org


# ── 1. Users ─────────────────────────────────────────────────────────────────


async def seed_users(db):
    """Create staff users for each role."""
    result = await db.execute(select(User).where(User.role == UserRole.MANAGER))
    if result.scalar_one_or_none():
        print("  Staff users already exist. Skipping.")
        return {}

    pw = get_password_hash("Staff@123456")

    users_data = [
        ("Rajesh Kumar", "rajesh@intdesignerp.com", UserRole.MANAGER, "9876543210"),
        ("Priya Sharma", "priya@intdesignerp.com", UserRole.BDE, "9876543211"),
        ("Amit Patel", "amit@intdesignerp.com", UserRole.SALES, "9876543212"),
        ("Vikram Singh", "vikram@intdesignerp.com", UserRole.SUPERVISOR, "9876543213"),
        ("Neha Gupta", "neha@intdesignerp.com", UserRole.SALES, "9876543214"),
        ("Suresh Reddy", "suresh@intdesignerp.com", UserRole.SUPERVISOR, "9876543215"),
        # Client users (will be linked to Client records)
        ("Ananya Desai", "ananya.desai@gmail.com", UserRole.CLIENT, "9812345670"),
        ("Karthik Iyer", "karthik.iyer@gmail.com", UserRole.CLIENT, "9812345671"),
        ("Meera Joshi", "meera.joshi@gmail.com", UserRole.CLIENT, "9812345672"),
    ]

    created = {}
    for full_name, email, role, phone in users_data:
        u = User(
            email=email,
            hashed_password=pw,
            full_name=full_name,
            role=role,
            phone=phone,
            is_active=True,
        )
        db.add(u)
        created[email] = u

    await db.flush()

    # Create OrgMembership for each new user
    for email, u in created.items():
        mem = OrgMembership(
            user_id=u.id,
            org_id=DEFAULT_ORG_ID,
            role=u.role,
            is_default=True,
            is_active=True,
        )
        db.add(mem)

    await db.flush()
    print(
        f"  Created {len(created)} staff/client users with org memberships (password: Staff@123456)"
    )
    return created


# ── 2. Inventory Items ───────────────────────────────────────────────────────

ITEMS_DATA = [
    # (name, sku, category, unit, base_price, selling_price, stock, reorder)
    (
        "BWP Marine Plywood 18mm",
        "PLY-BWP-18",
        "Plywood",
        "sqft",
        "85.00",
        "110.00",
        500,
        100,
    ),
    (
        "BWP Marine Plywood 12mm",
        "PLY-BWP-12",
        "Plywood",
        "sqft",
        "65.00",
        "85.00",
        400,
        80,
    ),
    ("MR Grade Plywood 8mm", "PLY-MR-08", "Plywood", "sqft", "45.00", "60.00", 300, 60),
    (
        "Sunmica White Glossy",
        "LAM-SUN-WG",
        "Laminates",
        "sqft",
        "25.00",
        "40.00",
        600,
        100,
    ),
    (
        "Sunmica Wood Grain Oak",
        "LAM-SUN-WO",
        "Laminates",
        "sqft",
        "30.00",
        "48.00",
        400,
        80,
    ),
    (
        "Greenlam Matt Walnut",
        "LAM-GL-MW",
        "Laminates",
        "sqft",
        "35.00",
        "55.00",
        350,
        70,
    ),
    (
        "Hettich Soft-Close Hinge",
        "HW-HET-SCH",
        "Hardware",
        "nos",
        "120.00",
        "180.00",
        200,
        50,
    ),
    (
        "Hettich Drawer Slide 18in",
        "HW-HET-DS18",
        "Hardware",
        "pair",
        "350.00",
        "520.00",
        100,
        30,
    ),
    (
        "Ebco Handle Bar 6in",
        "HW-EBC-HB6",
        "Hardware",
        "nos",
        "85.00",
        "130.00",
        150,
        40,
    ),
    ("Godrej Multi-Lock", "HW-GOD-ML", "Hardware", "nos", "450.00", "680.00", 80, 20),
    (
        "Vitrified Floor Tile 2x2",
        "TIL-VIT-22",
        "Tiles",
        "sqft",
        "55.00",
        "80.00",
        800,
        200,
    ),
    (
        "Italian Marble Statuario",
        "TIL-ITA-ST",
        "Tiles",
        "sqft",
        "280.00",
        "420.00",
        200,
        50,
    ),
    (
        "Ceramic Wall Tile 1x1",
        "TIL-CER-11",
        "Tiles",
        "sqft",
        "35.00",
        "52.00",
        600,
        150,
    ),
    (
        "Fevicol SH Adhesive 5kg",
        "ADH-FEV-5K",
        "Adhesives",
        "nos",
        "380.00",
        "520.00",
        50,
        15,
    ),
    (
        "M-Seal Silicone Sealant",
        "ADH-MSL-SS",
        "Adhesives",
        "nos",
        "180.00",
        "260.00",
        40,
        10,
    ),
    (
        "Asian Paints Royale Matt 10L",
        "PNT-APR-10",
        "Paint",
        "nos",
        "3200.00",
        "4200.00",
        30,
        10,
    ),
    (
        "Asian Paints Primer 10L",
        "PNT-APP-10",
        "Paint",
        "nos",
        "1800.00",
        "2400.00",
        25,
        8,
    ),
    (
        "Berger Weathercoat 20L",
        "PNT-BWC-20",
        "Paint",
        "nos",
        "4500.00",
        "6000.00",
        15,
        5,
    ),
    (
        "Havells 1.5mm Wire 90m",
        "ELC-HAV-15",
        "Electrical",
        "roll",
        "1800.00",
        "2500.00",
        20,
        5,
    ),
    (
        "Anchor Modular Switch 6A",
        "ELC-ANC-6A",
        "Electrical",
        "nos",
        "45.00",
        "70.00",
        300,
        80,
    ),
    (
        "Anchor Socket 16A",
        "ELC-ANC-16",
        "Electrical",
        "nos",
        "85.00",
        "130.00",
        150,
        40,
    ),
    (
        "Ashirvad CPVC Pipe 1in 3m",
        "PLB-ASH-1I",
        "Plumbing",
        "nos",
        "280.00",
        "400.00",
        50,
        15,
    ),
    (
        "Jaquar Basin Mixer",
        "PLB-JAQ-BM",
        "Plumbing",
        "nos",
        "3500.00",
        "5200.00",
        10,
        3,
    ),
    (
        "Saint-Gobain 6mm Glass",
        "GLS-SGB-6M",
        "Glass",
        "sqft",
        "120.00",
        "180.00",
        200,
        50,
    ),
    (
        "D'Decor Curtain Fabric",
        "FAB-DDC-CF",
        "Fabric",
        "meter",
        "450.00",
        "680.00",
        100,
        25,
    ),
    ("Kadappa Stone Slab", "STN-KAD-SL", "Stone", "sqft", "45.00", "70.00", 300, 80),
    (
        "UltraTech OPC 53 Cement",
        "CEM-ULT-53",
        "Cement",
        "bag",
        "380.00",
        "480.00",
        100,
        30,
    ),
    ("River Sand Fine", "SND-RIV-FN", "Sand", "cft", "55.00", "75.00", 500, 100),
    ("TMT Steel Bar 12mm", "STL-TMT-12", "Steel", "kg", "72.00", "95.00", 1000, 200),
    (
        "Gypsum Board 8x4",
        "MSC-GYP-84",
        "Miscellaneous",
        "nos",
        "420.00",
        "580.00",
        60,
        15,
    ),
]


async def seed_items(db):
    result = await db.execute(select(Item).limit(1))
    if result.scalar_one_or_none():
        print("  Inventory items already exist. Skipping.")
        return []

    items = []
    for name, sku, cat, unit, bp, sp, stock, reorder in ITEMS_DATA:
        item = Item(
            name=name,
            sku=sku,
            category=cat,
            unit=unit,
            base_price=d(bp),
            selling_price=d(sp),
            current_stock=float(stock),
            reorder_level=float(reorder),
            org_id=DEFAULT_ORG_ID,
        )
        db.add(item)
        items.append(item)

    await db.flush()
    print(f"  Created {len(items)} inventory items across 15 categories")
    return items


# ── 3. Vendors ────────────────────────────────────────────────────────────────

VENDORS_DATA = [
    (
        "Sharma Timber & Plywood",
        "Ramesh Sharma",
        "9845012345",
        "sharma.timber@gmail.com",
        "Industrial Area, Sector 5, Bangalore",
        "29AABCS1234R1Z5",
    ),
    (
        "Lakshmi Hardware Supplies",
        "Lakshmi Narayanan",
        "9845012346",
        "lakshmi.hw@gmail.com",
        "SP Road, Bangalore",
        "29AALCL4567R2Z3",
    ),
    (
        "Deccan Tile House",
        "Mohammed Yusuf",
        "9845012347",
        "deccan.tiles@gmail.com",
        "Jayanagar, Bangalore",
        "29AADCD7890R3Z1",
    ),
    (
        "Vijay Paints & Coatings",
        "Vijay Shetty",
        "9845012348",
        "vijay.paints@gmail.com",
        "Rajajinagar, Bangalore",
        "29AAFCV1234R4Z9",
    ),
    (
        "Sri Balaji Electricals",
        "Balaji Rao",
        "9845012349",
        "balaji.elec@gmail.com",
        "Avenue Road, Bangalore",
        "29AAGCS5678R5Z7",
    ),
    (
        "Nandi Plumbing Works",
        "Suresh Gowda",
        "9845012350",
        "nandi.plumb@gmail.com",
        "Yeshwanthpur, Bangalore",
        None,
    ),
    (
        "Royal Glass & Mirror",
        "Farhan Khan",
        "9845012351",
        "royal.glass@gmail.com",
        "Peenya, Bangalore",
        "29AAHCR2345R7Z3",
    ),
]


async def seed_vendors(db, items):
    result = await db.execute(select(Vendor).limit(1))
    if result.scalar_one_or_none():
        print("  Vendors already exist. Skipping.")
        return []

    vendors = []
    for name, cp, phone, email, addr, gst in VENDORS_DATA:
        v = Vendor(
            name=name,
            contact_person=cp,
            phone=phone,
            email=email,
            address=addr,
            gst_number=gst,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(v)
        vendors.append(v)

    await db.flush()

    # Link vendors to items they supply
    category_vendor_map = {
        "Plywood": 0,
        "Laminates": 0,
        "Hardware": 1,
        "Tiles": 2,
        "Stone": 2,
        "Paint": 3,
        "Adhesives": 3,
        "Electrical": 4,
        "Plumbing": 5,
        "Glass": 6,
        "Fabric": 6,
        "Cement": 1,
        "Sand": 1,
        "Steel": 1,
        "Miscellaneous": 3,
    }

    vi_count = 0
    for item in items:
        vendor_idx = category_vendor_map.get(item.category, 0)
        vendor = vendors[vendor_idx]
        # Vendor price is slightly less than base price
        vendor_price = item.base_price * d("0.92")
        vi = VendorItem(
            vendor_id=vendor.id,
            item_id=item.id,
            vendor_price=vendor_price.quantize(d("0.01")),
            lead_time_days=random.randint(2, 10),
            org_id=DEFAULT_ORG_ID,
        )
        db.add(vi)
        vi_count += 1

        # Some items have a second supplier
        if random.random() > 0.6:
            alt_idx = (vendor_idx + 1) % len(vendors)
            alt_price = item.base_price * d("0.95")
            vi2 = VendorItem(
                vendor_id=vendors[alt_idx].id,
                item_id=item.id,
                vendor_price=alt_price.quantize(d("0.01")),
                lead_time_days=random.randint(3, 14),
                org_id=DEFAULT_ORG_ID,
            )
            db.add(vi2)
            vi_count += 1

    await db.flush()
    print(f"  Created {len(vendors)} vendors with {vi_count} vendor-item links")
    return vendors


# ── 4. Leads ──────────────────────────────────────────────────────────────────

LEADS_DATA = [
    # (name, phone, email, source, status, location, property_type, property_status, carpet_area, budget, style)
    (
        "Ananya Desai",
        "9812345670",
        "ananya.desai@gmail.com",
        "Website",
        LeadStatus.CONVERTED,
        "Whitefield, Bangalore",
        PropertyType.APARTMENT,
        PropertyStatus.READY_TO_MOVE,
        1200.0,
        "15-20 Lakhs",
        "Modern Minimalist",
    ),
    (
        "Karthik Iyer",
        "9812345671",
        "karthik.iyer@gmail.com",
        "Referral",
        LeadStatus.CONVERTED,
        "Indiranagar, Bangalore",
        PropertyType.VILLA,
        PropertyStatus.RENOVATION,
        2800.0,
        "40-50 Lakhs",
        "Contemporary",
    ),
    (
        "Meera Joshi",
        "9812345672",
        "meera.joshi@gmail.com",
        "Instagram",
        LeadStatus.QUOTATION_SENT,
        "Koramangala, Bangalore",
        PropertyType.APARTMENT,
        PropertyStatus.READY_TO_MOVE,
        950.0,
        "10-15 Lakhs",
        "Scandinavian",
    ),
    (
        "Rohit Agarwal",
        "9812345673",
        "rohit.agarwal@gmail.com",
        "Website",
        LeadStatus.NEGOTIATION,
        "HSR Layout, Bangalore",
        PropertyType.PENTHOUSE,
        PropertyStatus.UNDER_CONSTRUCTION,
        3200.0,
        "50-70 Lakhs",
        "Luxury Modern",
    ),
    (
        "Deepa Krishnan",
        "9812345674",
        "deepa.k@gmail.com",
        "JustDial",
        LeadStatus.QUALIFIED,
        "Marathahalli, Bangalore",
        PropertyType.APARTMENT,
        PropertyStatus.READY_TO_MOVE,
        1100.0,
        "12-18 Lakhs",
        "Traditional",
    ),
    (
        "Sanjay Mehta",
        "9812345675",
        "sanjay.m@gmail.com",
        "Referral",
        LeadStatus.CONTACTED,
        "JP Nagar, Bangalore",
        PropertyType.INDEPENDENT_HOUSE,
        PropertyStatus.OCCUPIED,
        1800.0,
        "25-35 Lakhs",
        "Indo-Western",
    ),
    (
        "Pooja Verma",
        "9812345676",
        "pooja.v@gmail.com",
        "Website",
        LeadStatus.NEW,
        "Electronic City, Bangalore",
        PropertyType.APARTMENT,
        PropertyStatus.UNDER_CONSTRUCTION,
        800.0,
        "8-12 Lakhs",
        "Modern",
    ),
    (
        "Arjun Nair",
        "9812345677",
        "arjun.n@gmail.com",
        "Instagram",
        LeadStatus.NEW,
        "Sarjapur Road, Bangalore",
        PropertyType.STUDIO,
        PropertyStatus.READY_TO_MOVE,
        550.0,
        "5-8 Lakhs",
        "Compact Modern",
    ),
    (
        "Lakshmi Pillai",
        "9812345678",
        "lakshmi.p@gmail.com",
        "Google Ads",
        LeadStatus.LOST,
        "Yelahanka, Bangalore",
        PropertyType.APARTMENT,
        PropertyStatus.READY_TO_MOVE,
        1000.0,
        "10-14 Lakhs",
        "Classic",
    ),
    (
        "Rahul Bose",
        "9812345679",
        "rahul.b@gmail.com",
        "Referral",
        LeadStatus.CONTACTED,
        "Hebbal, Bangalore",
        PropertyType.OFFICE,
        PropertyStatus.RENOVATION,
        2000.0,
        "30-40 Lakhs",
        "Corporate Modern",
    ),
]


async def seed_leads(db, users):
    result = await db.execute(select(Lead).limit(1))
    if result.scalar_one_or_none():
        print("  Leads already exist. Skipping.")
        return []

    # Get admin user as fallback for assigned_to
    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()

    # Assign leads to BDE/Sales users
    sales_users = [
        u for u in users.values() if u.role in (UserRole.BDE, UserRole.SALES)
    ]
    if not sales_users:
        sales_users = [admin]

    leads = []
    scopes = [
        ["Kitchen", "Wardrobes", "False Ceiling"],
        ["Full Home", "Modular Kitchen", "Bathrooms"],
        ["Kitchen", "Living Room", "Master Bedroom"],
        ["Full Villa", "Landscaping", "Smart Home"],
        ["Kitchen", "Wardrobes"],
        ["Living Room", "Bedrooms", "Pooja Room"],
        ["Kitchen", "Wardrobe", "TV Unit"],
        ["Full Studio", "Kitchen", "Storage"],
        ["Full Home Renovation"],
        ["Office Partitions", "Reception", "Conference Room"],
    ]

    for i, (
        name,
        phone,
        email,
        source,
        status,
        loc,
        pt,
        ps,
        area,
        budget,
        style,
    ) in enumerate(LEADS_DATA):
        assigned = sales_users[i % len(sales_users)]
        lead = Lead(
            name=name,
            contact_number=phone,
            email=email,
            source=source,
            status=status,
            location=loc,
            property_type=pt,
            property_status=ps,
            carpet_area=area,
            budget_range=budget,
            design_style=style,
            scope_of_work=scopes[i],
            site_visit_availability=random.choice(list(SiteVisitAvailability)),
            assigned_to_id=assigned.id,
            notes=f"Interested in {style} design for their {pt.value.lower().replace('_', ' ')} in {loc}.",
            org_id=DEFAULT_ORG_ID,
        )
        db.add(lead)
        leads.append(lead)

    await db.flush()
    print(f"  Created {len(leads)} leads across various statuses")
    return leads


# ── 5. Quotations ─────────────────────────────────────────────────────────────


async def seed_quotations(db, leads, items, users):
    result = await db.execute(select(Quotation).limit(1))
    if result.scalar_one_or_none():
        print("  Quotations already exist. Skipping.")
        return []

    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()

    sales_users = [
        u for u in users.values() if u.role in (UserRole.SALES, UserRole.MANAGER)
    ]
    if not sales_users:
        sales_users = [admin]

    # Only create quotations for leads that are QUOTATION_SENT or beyond
    qualifying_statuses = {
        LeadStatus.QUOTATION_SENT,
        LeadStatus.NEGOTIATION,
        LeadStatus.CONVERTED,
    }

    room_templates = {
        "Kitchen": [
            ("Modular Kitchen Cabinets - Base Units", "Plywood", 50, "85.00", 20),
            ("Modular Kitchen Cabinets - Wall Units", "Plywood", 30, "85.00", 20),
            ("Kitchen Countertop - Granite", "Stone", 25, "280.00", 15),
            ("Kitchen Laminate Finish", "Laminates", 80, "35.00", 25),
            ("Soft-Close Hinges", "Hardware", 16, "120.00", 50),
            ("Drawer Slides 18in", "Hardware", 8, "350.00", 48),
        ],
        "Master Bedroom": [
            ("Wardrobe 8x7ft", "Plywood", 56, "85.00", 20),
            ("Wardrobe Laminate", "Laminates", 56, "30.00", 25),
            ("Wardrobe Handles", "Hardware", 8, "85.00", 50),
            ("False Ceiling", "Miscellaneous", 120, "45.00", 30),
            ("Wall Paint - Royale Matt", "Paint", 2, "3200.00", 30),
        ],
        "Living Room": [
            ("TV Unit 6ft", "Plywood", 30, "85.00", 20),
            ("Shoe Rack", "Plywood", 12, "65.00", 20),
            ("False Ceiling with Cove Light", "Miscellaneous", 180, "50.00", 30),
            ("Wall Paint - Premium", "Paint", 3, "3200.00", 30),
            ("Vitrified Flooring", "Tiles", 180, "55.00", 45),
        ],
        "Guest Bedroom": [
            ("Wardrobe 6x7ft", "Plywood", 42, "85.00", 20),
            ("Wardrobe Laminate", "Laminates", 42, "25.00", 25),
            ("Wardrobe Handles", "Hardware", 6, "85.00", 50),
            ("Wall Paint", "Paint", 1, "3200.00", 30),
        ],
        "Bathroom": [
            ("Basin Mixer Tap", "Plumbing", 1, "3500.00", 30),
            ("Wall Tiles", "Tiles", 80, "35.00", 40),
            ("Floor Tiles", "Tiles", 30, "55.00", 40),
            ("Plumbing Fittings", "Plumbing", 4, "280.00", 25),
        ],
    }

    quotations = []
    for lead in leads:
        if lead.status not in qualifying_statuses:
            continue

        created_by = random.choice(sales_users)
        rooms_to_include = random.sample(
            list(room_templates.keys()),
            k=min(random.randint(2, 4), len(room_templates)),
        )

        quote_total = d("0.00")
        quote = Quotation(
            lead_id=lead.id,
            version=1,
            total_amount=d("0.00"),
            org_id=DEFAULT_ORG_ID,
            status=(
                QuoteStatus.APPROVED
                if lead.status == LeadStatus.CONVERTED
                else QuoteStatus.SENT
            ),
            valid_until=now_utc() + timedelta(days=30),
            created_by_id=created_by.id,
            notes=f"Quotation for {lead.name} - {lead.design_style} style",
        )
        db.add(quote)
        await db.flush()

        for room_name in rooms_to_include:
            room = QuoteRoom(
                quotation_id=quote.id,
                name=room_name,
                area_sqft=random.uniform(80, 200),
                org_id=DEFAULT_ORG_ID,
            )
            db.add(room)
            await db.flush()

            for desc, cat, qty, price, markup in room_templates[room_name]:
                # Try to find matching inventory item
                matching = [it for it in items if it.category == cat]
                inv_item = matching[0] if matching else None
                unit_price = d(price)
                markup_pct = float(markup)
                final = (
                    unit_price * d(str(qty)) * d(str(1 + markup_pct / 100))
                ).quantize(d("0.01"))
                qi = QuoteItem(
                    room_id=room.id,
                    inventory_item_id=inv_item.id if inv_item else None,
                    description=desc,
                    quantity=float(qty),
                    unit=inv_item.unit if inv_item else "nos",
                    unit_price=unit_price,
                    markup_percentage=markup_pct,
                    final_price=final,
                    org_id=DEFAULT_ORG_ID,
                )
                db.add(qi)
                quote_total += final

        quote.total_amount = quote_total
        quotations.append(quote)

    await db.flush()
    print(f"  Created {len(quotations)} quotations with rooms & items")
    return quotations


# ── 6. Clients (from CONVERTED leads) ────────────────────────────────────────


async def seed_clients(db, leads, users):
    result = await db.execute(select(Client).limit(1))
    if result.scalar_one_or_none():
        print("  Clients already exist. Skipping.")
        return []

    client_emails = [
        "ananya.desai@gmail.com",
        "karthik.iyer@gmail.com",
    ]
    client_users = {email: u for email, u in users.items() if email in client_emails}

    clients = []
    converted_leads = [lead for lead in leads if lead.status == LeadStatus.CONVERTED]

    addresses = [
        "Flat 402, Prestige Lakeside, Whitefield, Bangalore 560066",
        "Villa 18, Palm Meadows, Indiranagar, Bangalore 560038",
    ]

    for i, lead in enumerate(converted_leads):
        email = client_emails[i] if i < len(client_emails) else None
        cu = client_users.get(email)
        if not cu:
            continue

        client = Client(
            user_id=cu.id,
            lead_id=lead.id,
            address=addresses[i] if i < len(addresses) else "Bangalore",
            gst_number=None,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(client)
        clients.append(client)

    await db.flush()
    print(f"  Created {len(clients)} client records")
    return clients


# ── 7. Projects ───────────────────────────────────────────────────────────────

DEFAULT_SPRINTS = [
    ("Sprint 1: Design & 3D", 10),
    ("Sprint 2: Civil & Demolition", 15),
    ("Sprint 3: Electrical & Plumbing", 10),
    ("Sprint 4: Carpentry & False Ceiling", 25),
    ("Sprint 5: Painting & Finishing", 12),
    ("Sprint 6: Handover & Deep Cleaning", 5),
]


async def seed_projects(db, clients, quotations, users):
    result = await db.execute(select(Project).limit(1))
    if result.scalar_one_or_none():
        print("  Projects already exist. Skipping.")
        return []

    manager = next((u for u in users.values() if u.role == UserRole.MANAGER), None)
    supervisor = next(
        (u for u in users.values() if u.role == UserRole.SUPERVISOR), None
    )

    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()

    approved_quotes = [q for q in quotations if q.status == QuoteStatus.APPROVED]
    projects = []

    project_configs = [
        (
            "Prestige Lakeside - Flat 402",
            ProjectStatus.IN_PROGRESS,
            -45,
            "Flat 402, Prestige Lakeside Habitat, Whitefield, Bangalore 560066",
        ),
        (
            "Palm Meadows Villa 18 Renovation",
            ProjectStatus.NOT_STARTED,
            5,
            "Villa 18, Palm Meadows, Whitefield Main Rd, Indiranagar, Bangalore 560038",
        ),
    ]

    for i, (client, quote) in enumerate(zip(clients, approved_quotes)):
        if i >= len(project_configs):
            break
        pname, pstatus, start_offset, site_addr = project_configs[i]
        start = today() + timedelta(days=start_offset)

        project = Project(
            name=pname,
            client_id=client.id,
            accepted_quotation_id=quote.id,
            status=pstatus,
            start_date=start,
            expected_end_date=start + timedelta(days=77),  # sum of sprint days
            total_project_value=quote.total_amount,
            manager_id=manager.id if manager else admin.id,
            supervisor_id=supervisor.id if supervisor else admin.id,
            site_address=site_addr,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(project)
        await db.flush()

        # Generate sprints
        current_date = start
        prev_sprint = None
        sprints = []
        for seq, (sname, days) in enumerate(DEFAULT_SPRINTS, 1):
            end = current_date + timedelta(days=days)

            # For the IN_PROGRESS project, mark earlier sprints as completed/active
            if pstatus == ProjectStatus.IN_PROGRESS:
                if seq <= 2:
                    s_status = SprintStatus.COMPLETED
                elif seq == 3:
                    s_status = SprintStatus.ACTIVE
                else:
                    s_status = SprintStatus.PENDING
            else:
                s_status = SprintStatus.PENDING

            sprint = Sprint(
                project_id=project.id,
                sequence_order=seq,
                name=sname,
                status=s_status,
                start_date=current_date,
                end_date=end,
                dependency_sprint_id=prev_sprint.id if prev_sprint else None,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(sprint)
            await db.flush()
            sprints.append(sprint)
            prev_sprint = sprint
            current_date = end + timedelta(days=1)

        project._sprints = sprints
        projects.append(project)

    await db.flush()
    print(f"  Created {len(projects)} projects with 6 sprints each")
    return projects


# ── 8. Project Wallets & Transactions ─────────────────────────────────────────


async def seed_financials(db, projects, users):
    result = await db.execute(select(ProjectWallet).limit(1))
    if result.scalar_one_or_none():
        print("  Financial data already exists. Skipping.")
        return

    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()
    manager = next((u for u in users.values() if u.role == UserRole.MANAGER), admin)

    for project in projects:
        total_value = project.total_project_value

        if project.status == ProjectStatus.IN_PROGRESS:
            # Client has paid 60% so far
            received = (total_value * d("0.60")).quantize(d("0.01"))
            spent = (total_value * d("0.35")).quantize(d("0.01"))

            wallet = ProjectWallet(
                project_id=project.id,
                total_agreed_value=total_value,
                total_received=received,
                total_spent=spent,
                pending_approvals=d("0.00"),
                org_id=DEFAULT_ORG_ID,
            )
            db.add(wallet)
            await db.flush()

            # Client payment transactions
            payments = [
                (d("0.20"), "Advance payment - 20%", "TXN-ADV-001"),
                (d("0.20"), "Milestone 1 - Civil work complete", "TXN-ML1-002"),
                (d("0.20"), "Milestone 2 - MEP work complete", "TXN-ML2-003"),
            ]
            for pct, desc, ref in payments:
                amt = (total_value * pct).quantize(d("0.01"))
                txn = Transaction(
                    project_id=project.id,
                    category=TransactionCategory.INFLOW,
                    source=TransactionSource.CLIENT,
                    amount=amt,
                    description=desc,
                    reference_id=ref,
                    recorded_by_id=manager.id,
                    status=TransactionStatus.CLEARED,
                    org_id=DEFAULT_ORG_ID,
                )
                db.add(txn)

            # Expense transactions
            expenses = [
                (
                    d("0.10"),
                    TransactionSource.VENDOR,
                    "Plywood & Laminate purchase - Kitchen",
                ),
                (d("0.08"), TransactionSource.VENDOR, "Tiles & Adhesives - Bathrooms"),
                (d("0.05"), TransactionSource.LABOR, "Civil work labor - Week 1-2"),
                (d("0.04"), TransactionSource.LABOR, "Electrical wiring labor"),
                (d("0.03"), TransactionSource.VENDOR, "Paint & Primer purchase"),
                (d("0.02"), TransactionSource.VENDOR, "Hardware fittings - Hettich"),
                (
                    d("0.02"),
                    TransactionSource.PETTY_CASH,
                    "Site consumables & transport",
                ),
                (
                    d("0.01"),
                    TransactionSource.PETTY_CASH,
                    "Miscellaneous site expenses",
                ),
            ]
            for pct, source, desc in expenses:
                amt = (total_value * pct).quantize(d("0.01"))
                txn = Transaction(
                    project_id=project.id,
                    category=TransactionCategory.OUTFLOW,
                    source=source,
                    amount=amt,
                    description=desc,
                    recorded_by_id=manager.id,
                    status=TransactionStatus.CLEARED,
                    org_id=DEFAULT_ORG_ID,
                )
                db.add(txn)

        else:
            # NOT_STARTED project — just advance payment
            advance = (total_value * d("0.20")).quantize(d("0.01"))
            wallet = ProjectWallet(
                project_id=project.id,
                total_agreed_value=total_value,
                total_received=advance,
                total_spent=d("0.00"),
                pending_approvals=d("0.00"),
                org_id=DEFAULT_ORG_ID,
            )
            db.add(wallet)
            await db.flush()

            txn = Transaction(
                project_id=project.id,
                category=TransactionCategory.INFLOW,
                source=TransactionSource.CLIENT,
                amount=advance,
                description="Advance payment - 20%",
                reference_id="TXN-ADV-101",
                recorded_by_id=manager.id,
                status=TransactionStatus.CLEARED,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(txn)

    await db.flush()
    print(f"  Created wallets & transactions for {len(projects)} projects")


# ── 9. Purchase Orders ────────────────────────────────────────────────────────


async def seed_purchase_orders(db, projects, items, vendors, users):
    result = await db.execute(select(PurchaseOrder).limit(1))
    if result.scalar_one_or_none():
        print("  Purchase orders already exist. Skipping.")
        return

    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()

    # General stock PO (not project-specific)
    general_po = PurchaseOrder(
        vendor_id=vendors[0].id,
        status=POStatus.RECEIVED,
        is_project_specific=False,
        total_amount=d("0.00"),
        notes="Monthly general stock replenishment",
        created_by_id=admin.id,
        org_id=DEFAULT_ORG_ID,
    )
    db.add(general_po)
    await db.flush()

    po_total = d("0.00")
    plywood_items = [it for it in items if it.category == "Plywood"]
    for item in plywood_items[:2]:
        qty = random.randint(50, 200)
        price = (item.base_price * d("0.92")).quantize(d("0.01"))
        total = (price * d(str(qty))).quantize(d("0.01"))
        poi = POItem(
            purchase_order_id=general_po.id,
            item_id=item.id,
            quantity=float(qty),
            unit_price=price,
            total_price=total,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(poi)
        po_total += total

    general_po.total_amount = po_total

    # Project-specific POs for the in-progress project
    active_project = next(
        (p for p in projects if p.status == ProjectStatus.IN_PROGRESS), None
    )
    if active_project:
        # PO 1: Tiles for bathroom (RECEIVED)
        tile_vendor = vendors[2]  # Deccan Tile House
        po1 = PurchaseOrder(
            vendor_id=tile_vendor.id,
            status=POStatus.RECEIVED,
            is_project_specific=True,
            project_id=active_project.id,
            total_amount=d("0.00"),
            notes="Bathroom tiles & flooring for Flat 402",
            created_by_id=admin.id,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(po1)
        await db.flush()

        tile_items = [it for it in items if it.category == "Tiles"]
        po1_total = d("0.00")
        for item in tile_items[:2]:
            qty = random.randint(60, 150)
            price = (item.base_price * d("0.93")).quantize(d("0.01"))
            total = (price * d(str(qty))).quantize(d("0.01"))
            poi = POItem(
                purchase_order_id=po1.id,
                item_id=item.id,
                quantity=float(qty),
                unit_price=price,
                total_price=total,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(poi)
            po1_total += total
        po1.total_amount = po1_total

        # PO 2: Hardware (ORDERED, pending delivery)
        hw_vendor = vendors[1]
        po2 = PurchaseOrder(
            vendor_id=hw_vendor.id,
            status=POStatus.ORDERED,
            is_project_specific=True,
            project_id=active_project.id,
            total_amount=d("0.00"),
            notes="Hettich hardware for kitchen cabinets",
            created_by_id=admin.id,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(po2)
        await db.flush()

        hw_items = [it for it in items if it.category == "Hardware"]
        po2_total = d("0.00")
        for item in hw_items[:3]:
            qty = random.randint(10, 40)
            price = (item.base_price * d("0.90")).quantize(d("0.01"))
            total = (price * d(str(qty))).quantize(d("0.01"))
            poi = POItem(
                purchase_order_id=po2.id,
                item_id=item.id,
                quantity=float(qty),
                unit_price=price,
                total_price=total,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(poi)
            po2_total += total
        po2.total_amount = po2_total

        # PO 3: Paint (DRAFT)
        paint_vendor = vendors[3]
        po3 = PurchaseOrder(
            vendor_id=paint_vendor.id,
            status=POStatus.DRAFT,
            is_project_specific=True,
            project_id=active_project.id,
            total_amount=d("0.00"),
            notes="Paint requirement for Sprint 5 - Painting & Finishing",
            created_by_id=admin.id,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(po3)
        await db.flush()

        paint_items = [it for it in items if it.category == "Paint"]
        po3_total = d("0.00")
        for item in paint_items:
            qty = random.randint(3, 8)
            price = (item.base_price * d("0.94")).quantize(d("0.01"))
            total = (price * d(str(qty))).quantize(d("0.01"))
            poi = POItem(
                purchase_order_id=po3.id,
                item_id=item.id,
                quantity=float(qty),
                unit_price=price,
                total_price=total,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(poi)
            po3_total += total
        po3.total_amount = po3_total

    await db.flush()
    print("  Created purchase orders (general + project-specific)")


# ── 10. Stock Transactions ────────────────────────────────────────────────────


async def seed_stock_transactions(db, projects, items, users):
    result = await db.execute(select(StockTransaction).limit(1))
    if result.scalar_one_or_none():
        print("  Stock transactions already exist. Skipping.")
        return

    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()
    supervisor = next(
        (u for u in users.values() if u.role == UserRole.SUPERVISOR), admin
    )

    active_project = next(
        (p for p in projects if p.status == ProjectStatus.IN_PROGRESS), None
    )
    if not active_project:
        return

    # Stock issued to the active project
    issued_items = [
        ("Plywood", 80, "Plywood issued for kitchen base units"),
        ("Laminates", 60, "Laminates for kitchen cabinets"),
        ("Hardware", 16, "Soft-close hinges for kitchen"),
        ("Cement", 15, "Cement bags for civil work"),
        ("Sand", 100, "Sand for plastering and flooring"),
        ("Adhesives", 5, "Fevicol for laminate work"),
    ]

    for cat, qty, notes in issued_items:
        matching = [it for it in items if it.category == cat]
        if not matching:
            continue
        item = matching[0]
        st = StockTransaction(
            item_id=item.id,
            quantity=-qty,
            transaction_type=StockTransactionType.PROJECT_ISSUE,
            reference_id=active_project.id,
            performed_by=supervisor.id,
            unit_cost_at_time=item.base_price,
            notes=notes,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(st)

    # Some PURCHASE_IN transactions (from general PO receiving)
    for item in items[:5]:
        st = StockTransaction(
            item_id=item.id,
            quantity=random.randint(50, 200),
            transaction_type=StockTransactionType.PURCHASE_IN,
            performed_by=admin.id,
            unit_cost_at_time=item.base_price,
            notes="Stock received from monthly PO",
            org_id=DEFAULT_ORG_ID,
        )
        db.add(st)

    # One DAMAGED transaction
    damage_item = items[0]
    st = StockTransaction(
        item_id=damage_item.id,
        quantity=-5,
        transaction_type=StockTransactionType.DAMAGED,
        performed_by=supervisor.id,
        unit_cost_at_time=damage_item.base_price,
        notes="Water damage during storage - 5 sheets written off",
        org_id=DEFAULT_ORG_ID,
    )
    db.add(st)

    await db.flush()
    print("  Created stock transactions (purchases, issues, damaged)")


# ── 11. Daily Logs ────────────────────────────────────────────────────────────


async def seed_daily_logs(db, projects, users):
    result = await db.execute(select(DailyLog).limit(1))
    if result.scalar_one_or_none():
        print("  Daily logs already exist. Skipping.")
        return

    supervisor = next(
        (u for u in users.values() if u.role == UserRole.SUPERVISOR), None
    )
    if not supervisor:
        return

    active_project = next(
        (p for p in projects if p.status == ProjectStatus.IN_PROGRESS), None
    )
    if not active_project:
        return

    sprints = active_project._sprints

    log_entries = [
        # Sprint 1 logs (completed)
        (
            0,
            1,
            "Conducted initial site survey and measurements. Took detailed photos.",
            None,
            True,
        ),
        (
            0,
            3,
            "Completed 2D layout plan. Shared with client for approval.",
            None,
            True,
        ),
        (0, 5, "3D renders completed for kitchen and master bedroom.", None, True),
        (
            0,
            7,
            "Material selection finalized with client. Plywood & laminate samples approved.",
            None,
            True,
        ),
        (
            0,
            9,
            "Final design approval received from client. Ready for execution.",
            None,
            True,
        ),
        # Sprint 2 logs (completed)
        (
            1,
            1,
            "Demolition work started. Removed old kitchen cabinets and false ceiling.",
            "Noise complaints from neighbors - working hours restricted to 10AM-5PM",
            True,
        ),
        (
            1,
            3,
            "Civil work for kitchen platform started. Electrical points marked.",
            None,
            True,
        ),
        (
            1,
            5,
            "Bathroom demolition complete. New plumbing points marked.",
            "Slight delay due to unexpected plumbing rerouting needed",
            False,
        ),
        (
            1,
            8,
            "Flooring base preparation complete. Waterproofing done in bathrooms.",
            None,
            True,
        ),
        (
            1,
            12,
            "All civil and demolition work complete. Site cleaned for next phase.",
            None,
            True,
        ),
        # Sprint 3 logs (active)
        (
            2,
            1,
            "Electrical wiring started. Running concealed wiring in all rooms.",
            None,
            True,
        ),
        (
            2,
            3,
            "Plumbing rough-in complete for both bathrooms. Pressure testing done.",
            None,
            True,
        ),
        (
            2,
            5,
            "AC piping and drain installation in progress. 60% electrical done.",
            "Waiting for additional wire rolls - expected tomorrow",
            False,
        ),
    ]

    for sprint_idx, day_offset, notes, blockers, visible in log_entries:
        if sprint_idx >= len(sprints):
            continue
        sprint = sprints[sprint_idx]
        log_date = sprint.start_date + timedelta(days=day_offset)

        log = DailyLog(
            project_id=active_project.id,
            sprint_id=sprint.id,
            logged_by_id=supervisor.id,
            date=log_date,
            notes=notes,
            blockers=blockers,
            visible_to_client=visible,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(log)

    await db.flush()
    print("  Created daily progress logs for active project")


# ── 12. Variation Orders ──────────────────────────────────────────────────────


async def seed_variation_orders(db, projects, users):
    result = await db.execute(select(VariationOrder).limit(1))
    if result.scalar_one_or_none():
        print("  Variation orders already exist. Skipping.")
        return

    manager = next((u for u in users.values() if u.role == UserRole.MANAGER), None)
    if not manager:
        return

    active_project = next(
        (p for p in projects if p.status == ProjectStatus.IN_PROGRESS), None
    )
    if not active_project:
        return

    sprints = active_project._sprints

    vos_data = [
        (
            "Add false ceiling with cove lighting in guest bedroom",
            d("35000.00"),
            VOStatus.APPROVED,
            3,
        ),
        (
            "Upgrade kitchen countertop from granite to Italian marble",
            d("28000.00"),
            VOStatus.PAID,
            3,
        ),
        (
            "Add shoe rack and coat hanger unit in foyer",
            d("18000.00"),
            VOStatus.REQUESTED,
            None,
        ),
    ]

    for desc, cost, status, sprint_idx in vos_data:
        vo = VariationOrder(
            project_id=active_project.id,
            description=desc,
            additional_cost=cost,
            status=status,
            linked_sprint_id=(
                sprints[sprint_idx].id
                if sprint_idx is not None and sprint_idx < len(sprints)
                else None
            ),
            requested_by_id=manager.id,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(vo)

    await db.flush()
    print("  Created variation orders for active project")


# ── 13. Labor Teams & Workers ─────────────────────────────────────────────────


async def seed_labor(db, projects, users):
    result = await db.execute(select(LaborTeam).limit(1))
    if result.scalar_one_or_none():
        print("  Labor data already exist. Skipping.")
        return

    supervisor = next(
        (u for u in users.values() if u.role == UserRole.SUPERVISOR), None
    )
    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()

    teams_data = [
        (
            "Roy's Civil Crew",
            "Shankar Roy",
            "9800011001",
            Specialization.CIVIL,
            PaymentModel.DAILY_WAGE,
            d("800.00"),
            [
                ("Raju", SkillLevel.SKILLED, d("900.00"), "9900011001"),
                ("Babu", SkillLevel.HELPER, d("600.00"), "9900011002"),
                ("Mohan", SkillLevel.HELPER, d("600.00"), "9900011003"),
                ("Krishna", SkillLevel.SKILLED, d("850.00"), "9900011004"),
            ],
        ),
        (
            "Arun's Carpentry Team",
            "Arun Kumar",
            "9800011002",
            Specialization.CARPENTRY,
            PaymentModel.CONTRACT_FIXED,
            d("1200.00"),
            [
                ("Sunil", SkillLevel.SKILLED, d("1200.00"), "9900012001"),
                ("Dinesh", SkillLevel.SKILLED, d("1100.00"), "9900012002"),
                ("Prakash", SkillLevel.FOREMAN, d("1500.00"), "9900012003"),
                ("Gopi", SkillLevel.HELPER, d("700.00"), "9900012004"),
                ("Ramesh", SkillLevel.HELPER, d("700.00"), "9900012005"),
            ],
        ),
        (
            "Salim Painting Works",
            "Salim Khan",
            "9800011003",
            Specialization.PAINTING,
            PaymentModel.DAILY_WAGE,
            d("900.00"),
            [
                ("Iqbal", SkillLevel.SKILLED, d("950.00"), "9900013001"),
                ("Farooq", SkillLevel.HELPER, d("650.00"), "9900013002"),
                ("Rafiq", SkillLevel.SKILLED, d("900.00"), "9900013003"),
            ],
        ),
        (
            "KV Electricals",
            "Kumar V",
            "9800011004",
            Specialization.ELECTRICAL,
            PaymentModel.DAILY_WAGE,
            d("1000.00"),
            [
                ("Sathish", SkillLevel.FOREMAN, d("1400.00"), "9900014001"),
                ("Mani", SkillLevel.SKILLED, d("1000.00"), "9900014002"),
                ("Ravi", SkillLevel.HELPER, d("700.00"), "9900014003"),
            ],
        ),
        (
            "Ganesh Plumbing",
            "Ganesh",
            "9800011005",
            Specialization.PLUMBING,
            PaymentModel.DAILY_WAGE,
            d("950.00"),
            [
                ("Naveen", SkillLevel.SKILLED, d("1000.00"), "9900015001"),
                ("Harish", SkillLevel.HELPER, d("650.00"), "9900015002"),
            ],
        ),
    ]

    teams = []
    for tname, leader, phone, spec, pay_model, rate, workers_list in teams_data:
        team = LaborTeam(
            name=tname,
            leader_name=leader,
            contact_number=phone,
            specialization=spec,
            payment_model=pay_model,
            default_daily_rate=rate,
            supervisor_id=supervisor.id if supervisor else admin.id,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(team)
        await db.flush()

        for wname, skill, wrate, wphone in workers_list:
            w = Worker(
                team_id=team.id,
                name=wname,
                skill_level=skill,
                daily_rate=wrate,
                phone=wphone,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(w)

        teams.append(team)

    await db.flush()

    # Attendance logs for the active project
    active_project = next(
        (p for p in projects if p.status == ProjectStatus.IN_PROGRESS), None
    )
    if active_project:
        sprints = active_project._sprints

        # Civil crew worked during Sprint 2
        if len(sprints) >= 2 and len(teams) >= 1:
            civil_team = teams[0]  # Roy's Civil Crew
            sprint2 = sprints[1]
            for day_offset in range(0, 12, 1):
                if day_offset % 7 == 6:  # Skip Sundays
                    continue
                log_date = sprint2.start_date + timedelta(days=day_offset)
                workers = random.randint(3, 4)
                hours = random.uniform(7.5, 9.0)
                cost = d(str(workers)) * civil_team.default_daily_rate

                att = AttendanceLog(
                    project_id=active_project.id,
                    sprint_id=sprint2.id,
                    team_id=civil_team.id,
                    date=log_date,
                    workers_present=workers,
                    total_hours=round(hours, 1),
                    calculated_cost=cost,
                    status=AttendanceStatus.PAID,
                    notes=f"Civil work - {workers} workers present",
                    logged_by_id=supervisor.id if supervisor else admin.id,
                    org_id=DEFAULT_ORG_ID,
                )
                db.add(att)

        # Electricals during Sprint 3
        if len(sprints) >= 3 and len(teams) >= 4:
            elec_team = teams[3]  # KV Electricals
            sprint3 = sprints[2]
            for day_offset in range(0, 6, 1):
                if day_offset % 7 == 6:
                    continue
                log_date = sprint3.start_date + timedelta(days=day_offset)
                workers = random.randint(2, 3)
                hours = random.uniform(7.0, 8.5)
                cost = d(str(workers)) * elec_team.default_daily_rate

                status = (
                    AttendanceStatus.APPROVED_BY_MANAGER
                    if day_offset < 4
                    else AttendanceStatus.PENDING
                )

                att = AttendanceLog(
                    project_id=active_project.id,
                    sprint_id=sprint3.id,
                    team_id=elec_team.id,
                    date=log_date,
                    workers_present=workers,
                    total_hours=round(hours, 1),
                    calculated_cost=cost,
                    status=status,
                    notes=f"Electrical wiring - {workers} workers",
                    logged_by_id=supervisor.id if supervisor else admin.id,
                    org_id=DEFAULT_ORG_ID,
                )
                db.add(att)

        # Plumbing during Sprint 3
        if len(sprints) >= 3 and len(teams) >= 5:
            plumb_team = teams[4]  # Ganesh Plumbing
            sprint3 = sprints[2]
            for day_offset in range(0, 4, 1):
                log_date = sprint3.start_date + timedelta(days=day_offset)
                workers = 2
                hours = 8.0
                cost = d(str(workers)) * plumb_team.default_daily_rate

                att = AttendanceLog(
                    project_id=active_project.id,
                    sprint_id=sprint3.id,
                    team_id=plumb_team.id,
                    date=log_date,
                    workers_present=workers,
                    total_hours=hours,
                    calculated_cost=cost,
                    status=AttendanceStatus.APPROVED_BY_MANAGER,
                    notes=f"Plumbing rough-in - {workers} workers",
                    org_id=DEFAULT_ORG_ID,
                    logged_by_id=supervisor.id if supervisor else admin.id,
                )
                db.add(att)

    await db.flush()
    print(f"  Created {len(teams)} labor teams with workers & attendance logs")
    return teams


# ── 14. Notifications ─────────────────────────────────────────────────────────


async def seed_notifications(db, users):
    result = await db.execute(select(Notification).limit(1))
    if result.scalar_one_or_none():
        print("  Notifications already exist. Skipping.")
        return

    admin_result = await db.execute(
        select(User).where(User.email == "admin@intdesignerp.com")
    )
    admin = admin_result.scalar_one()

    manager = next((u for u in users.values() if u.role == UserRole.MANAGER), admin)
    supervisor = next(
        (u for u in users.values() if u.role == UserRole.SUPERVISOR), admin
    )
    bde = next((u for u in users.values() if u.role == UserRole.BDE), admin)

    notifs = [
        (
            manager.id,
            NotificationType.APPROVAL_REQ,
            "PO Approval Required",
            "Purchase Order for Hettich hardware (Rs 45,200) needs your approval.",
            "/dashboard/inventory",
            False,
        ),
        (
            manager.id,
            NotificationType.PAYMENT_RECEIVED,
            "Client Payment Received",
            "Ananya Desai has made a payment of Rs 2,40,000 for Prestige Lakeside project.",
            "/dashboard/projects",
            True,
        ),
        (
            manager.id,
            NotificationType.ALERT,
            "Sprint Delay Alert",
            "Sprint 3: Electrical & Plumbing is running 2 days behind schedule.",
            "/dashboard/projects",
            False,
        ),
        (
            supervisor.id,
            NotificationType.INFO,
            "Material Dispatched",
            "15 bags of UltraTech Cement have been dispatched to site.",
            "/dashboard/inventory",
            False,
        ),
        (
            supervisor.id,
            NotificationType.APPROVAL_REQ,
            "Attendance Pending Approval",
            "5 attendance logs from this week are pending your submission.",
            "/dashboard/labor",
            False,
        ),
        (
            bde.id,
            NotificationType.INFO,
            "New Lead Assigned",
            "A new lead 'Rohit Agarwal' from Website has been assigned to you.",
            "/dashboard/leads",
            False,
        ),
        (
            admin.id,
            NotificationType.ALERT,
            "Low Stock Alert",
            "3 items are below reorder level: Plywood 18mm, Hinges, Wire rolls.",
            "/dashboard/inventory",
            False,
        ),
        (
            admin.id,
            NotificationType.INFO,
            "Quotation Approved",
            "Quotation v1 for Karthik Iyer has been approved. Ready for project conversion.",
            "/dashboard/quotations",
            True,
        ),
    ]

    for recipient_id, ntype, title, body, url, is_read in notifs:
        n = Notification(
            recipient_id=recipient_id,
            type=ntype,
            title=title,
            body=body,
            action_url=url,
            is_read=is_read,
            org_id=DEFAULT_ORG_ID,
        )
        db.add(n)

    await db.flush()
    print(f"  Created {len(notifs)} notifications")


# ── Main ──────────────────────────────────────────────────────────────────────


async def main():
    do_reset = "--reset" in sys.argv

    print("=" * 60)
    print("IntDesignERP: Comprehensive Data Seed")
    if do_reset:
        print("MODE: RESET (clearing all data first)")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        try:
            if do_reset:
                print("\n[0/15] Resetting database...")
                await reset_all(db)

            print("\n[1/15] Seeding organization...")
            await seed_organization(db)

            print("[2/15] Seeding users...")
            users = await seed_users(db)

            print("[3/15] Seeding inventory items...")
            items = await seed_items(db)

            print("[4/15] Seeding vendors & vendor-item links...")
            vendors = await seed_vendors(db, items)

            print("[5/15] Seeding leads...")
            leads = await seed_leads(db, users)

            print("[6/15] Seeding quotations...")
            quotations = await seed_quotations(db, leads, items, users)

            print("[7/15] Seeding clients...")
            clients = await seed_clients(db, leads, users)

            print("[8/15] Seeding projects & sprints...")
            projects = await seed_projects(db, clients, quotations, users)

            print("[9/15] Seeding financials (wallets & transactions)...")
            await seed_financials(db, projects, users)

            print("[10/15] Seeding purchase orders...")
            await seed_purchase_orders(db, projects, items, vendors, users)

            print("[11/15] Seeding stock transactions...")
            await seed_stock_transactions(db, projects, items, users)

            print("[12/15] Seeding daily logs...")
            await seed_daily_logs(db, projects, users)

            print("[13/15] Seeding variation orders...")
            await seed_variation_orders(db, projects, users)

            print("[14/15] Seeding labor teams, workers & attendance...")
            await seed_labor(db, projects, users)

            print("[15/15] Seeding notifications...")
            await seed_notifications(db, users)

            await db.commit()
            print("\n" + "=" * 60)
            print("Seeding complete! All data committed successfully.")
            print("=" * 60)

        except Exception as e:
            await db.rollback()
            print(f"\nERROR: Seeding failed — {e}")
            import traceback

            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(main())
