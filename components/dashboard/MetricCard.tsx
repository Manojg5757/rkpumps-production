"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { IndianRupee, Receipt, Percent, AlertTriangle, TrendingUp, Clock } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: 'IndianRupee' | 'Receipt' | 'Percent' | 'AlertTriangle' | 'TrendingUp' | 'Clock';
  delay: number;
  alert?: boolean;
  link?: string;
}

export function MetricCard({ title, value, sub, icon, delay, alert, link }: MetricCardProps) {
  const icons = { IndianRupee, Receipt, Percent, AlertTriangle, TrendingUp, Clock };
  const IconComponent = icons[icon];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-white p-5 rounded-xl shadow-sm border ${
        alert ? 'border-amber-200 bg-amber-50' : 'border-gray-100'
      } flex items-center justify-between hover:shadow-md transition-shadow`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className={`text-xl font-bold truncate ${alert ? 'text-amber-700' : 'text-gray-900'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`p-3 rounded-full flex-shrink-0 ml-3 ${alert ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
        <IconComponent size={22} />
      </div>
    </motion.div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
