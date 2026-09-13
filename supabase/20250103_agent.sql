CREATE TABLE IF NOT EXISTS agent_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    "organizationName" TEXT,
    "schoolId" UUID REFERENCES schools(id),
    "ministryId" UUID REFERENCES ministries(id),
    "isActive" BOOLEAN DEFAULT true,
    "lastCheckAt" TIMESTAMPTZ,
    "lastUpdateAt" TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING',
    "lastError" TEXT,
    "contentHash" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sourceId" UUID NOT NULL REFERENCES agent_sources(id) ON DELETE CASCADE,
    level TEXT DEFAULT 'INFO',
    action TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
