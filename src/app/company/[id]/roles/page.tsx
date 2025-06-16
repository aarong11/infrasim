'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CompanyRoles } from '@/components/CompanyRoles';

export default function CompanyRolesPage() {
  const params = useParams();
  const companyId = params.id as string;

  return (
    <div className="h-full w-full pr-96 bg-cyber-dark text-white">
      <CompanyRoles companyId={companyId} />
    </div>
  );
}