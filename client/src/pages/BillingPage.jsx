import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  HardDrive,
  Database,
  Activity,
  Shield,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BillingPage() {
  const { currentProject, updateProject } = useProject();
  const [switchingPlan, setSwitchingPlan] = useState(false);

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  const currentPlan = currentProject.plan || 'free';
  const stats = currentProject.stats || {
    documents: 240,
    storageBytes: 15400000,
    files: 8,
    users: 12
  };

  const plans = [
    {
      id: 'free',
      name: 'Starter Developer',
      price: '$0',
      period: 'forever',
      desc: 'Ideal for prototyping, early-stage MVPs, and hobby projects without credit card.',
      limits: {
        documents: 25000,
        storageBytes: 500 * 1024 * 1024, // 500 MB
        monthlyRequests: 50000,
        maxFileSize: 25 * 1024 * 1024 // 25 MB
      },
      features: [
        'Isolated Document NoSQL Database',
        'Built-in JWT User Authentication',
        '500 MB Encrypted Cloud Storage',
        'Real-time WebSocket Subscriptions',
        'Standard Security Rules Engine',
        'Community Support'
      ]
    },
    {
      id: 'pro',
      name: 'Growth Scale',
      price: '$29',
      period: 'per month',
      popular: true,
      desc: 'For production applications and growing teams requiring high bandwidth and storage.',
      limits: {
        documents: 1000000,
        storageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
        monthlyRequests: 5000000,
        maxFileSize: 500 * 1024 * 1024 // 500 MB
      },
      features: [
        'Everything in Starter',
        '1,000,000 Documents Storage',
        '50 GB High-Speed Object Storage',
        '5,000,000 API Requests / month',
        'Priority WebSocket Connection Pools',
        'Automated Daily Database Backups',
        'Detailed Audit Trail Retention',
        'Standard Email & Discord Support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Dedicated',
      price: '$199',
      period: 'per month',
      desc: 'Dedicated single-tenant infrastructure with custom SLAs and SOC2 compliance.',
      limits: {
        documents: 50000000,
        storageBytes: 1024 * 1024 * 1024 * 1024, // 1 TB
        monthlyRequests: 100000000,
        maxFileSize: 5 * 1024 * 1024 * 1024 // 5 GB
      },
      features: [
        'Everything in Growth',
        '50,000,000+ Documents & 1 TB Storage',
        'Dedicated Regional Database Shards',
        '99.99% Availability Uptime SLA',
        'Custom SSO SAML & SCIM Directory Sync',
        'VPC Peering & Custom Domain SSL',
        '24/7 Dedicated Support Engineering'
      ]
    }
  ];

  const activePlanConfig = plans.find(p => p.id === currentPlan) || plans[0];

  // Calculate quota usages
  const docPercent = Math.min(100, Math.round(((stats.documents || 0) / activePlanConfig.limits.documents) * 100));
  const storagePercent = Math.min(100, Math.round(((stats.storageBytes || 0) / activePlanConfig.limits.storageBytes) * 100));
  const requestEstimate = 482; // sample 24h
  const reqPercent = Math.min(100, Math.round((requestEstimate / activePlanConfig.limits.monthlyRequests) * 100));

  const handleSelectPlan = async (planId) => {
    if (planId === currentPlan) return;
    try {
      setSwitchingPlan(true);
      await updateProject(currentProject.id, { plan: planId });
      alert(`Project "${currentProject.name}" plan updated to ${planId.toUpperCase()}!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSwitchingPlan(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Billing & Quota Management</h1>
            <p className="text-xs text-slate-400">
              Transparent usage tracking against hard limits. Scale tiers with zero downtime.
            </p>
          </div>
        </div>

        <Badge variant={currentPlan === 'pro' ? 'indigo' : currentPlan === 'enterprise' ? 'cyan' : 'neutral'} size="lg">
          ACTIVE PLAN: {currentPlan.toUpperCase()}
        </Badge>
      </div>

      {/* Live Quota Consumption Meters */}
      <Card className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white">Current Billing Cycle Consumption</h3>
          <p className="text-xs text-slate-400">Resource metrics for project {currentProject.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Documents Quota */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" /> Database Records
              </span>
              <span className="font-mono text-slate-400">
                {(stats.documents || 0).toLocaleString()} / {activePlanConfig.limits.documents.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stratum-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(docPercent, 3)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>{docPercent}% consumed</span>
              <span>{(activePlanConfig.limits.documents - (stats.documents || 0)).toLocaleString()} remaining</span>
            </div>
          </div>

          {/* Storage Quota */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Cloud Storage
              </span>
              <span className="font-mono text-slate-400">
                {formatBytes(stats.storageBytes)} / {formatBytes(activePlanConfig.limits.storageBytes)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stratum-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(storagePercent, 3)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>{storagePercent}% consumed</span>
              <span>{formatBytes(activePlanConfig.limits.storageBytes - (stats.storageBytes || 0))} remaining</span>
            </div>
          </div>

          {/* API Requests Quota */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Monthly API Calls
              </span>
              <span className="font-mono text-slate-400">
                {requestEstimate.toLocaleString()} / {activePlanConfig.limits.monthlyRequests.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stratum-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(reqPercent, 3)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>{reqPercent}% consumed</span>
              <span>Unlimited bursts</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Plan Tiers Matrix */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase font-mono tracking-wider mb-4">
          Available Subscription Plans
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 transition-all ${
                  isCurrent ? 'ring-2 ring-cyan-400 bg-stratum-850/90 shadow-2xl' : 'hover:border-white/20'
                }`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-[10px] font-bold text-stratum-950 uppercase">
                    Recommended
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-cyan-400 text-[10px] font-bold text-stratum-950 uppercase">
                    Current Plan
                  </div>
                )}

                <div>
                  <h4 className="text-base font-bold text-white">{plan.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.desc}</p>

                  <div className="flex items-baseline gap-1 my-5">
                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs font-mono text-slate-400">/{plan.period}</span>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-2.5 text-xs">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-slate-300">
                        <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  <Button
                    variant={isCurrent ? 'outline' : plan.popular ? 'primary' : 'secondary'}
                    size="sm"
                    className="w-full justify-center"
                    disabled={isCurrent || switchingPlan}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isCurrent ? 'Active Subscription' : `Switch to ${plan.name.split(' ')[0]}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

