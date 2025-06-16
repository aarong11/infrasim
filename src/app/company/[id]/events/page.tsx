'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CompanyEvents } from '@/components/CompanyEvents';

export default function CompanyEventsPage() {
  const params = useParams();
  const companyId = params.id as string;

  return <CompanyEvents companyId={companyId} />;
}