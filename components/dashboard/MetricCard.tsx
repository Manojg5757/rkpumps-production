"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import React from "react";
import { IndianRupee, Receipt, Percent, AlertTriangle } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: 'IndianRupee' | 'Receipt' | 'Percent' | 'AlertTriangle';
  delay: number;
  alert?: boolean;
  link?: string;
}

export function MetricCard({ title, value, icon, delay, alert, link }: MetricCardProps) {
  const icons = {
    IndianRupee,
    Receipt,
    Percent,
    AlertTriangle
  };
  const IconComponent = icons[icon];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-white p-6 rounded-xl shadow-sm border ${
        alert ? 'border-amber-200 bg-amber-50' : 'border-gray-100'
      } flex items-center justify-between hover:shadow-md transition-shadow`}
    >
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className={`text-2xl font-bold ${alert ? 'text-amber-700' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
      <div className={`p-3 rounded-full ${alert ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
        <IconComponent size={24} />
      </div>
    </motion.div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
