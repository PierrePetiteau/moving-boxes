"use client";

import dynamic from "next/dynamic";
import { Box } from "@src/lib/notion";
import { Suspense, useEffect, useMemo, useRef } from "react";

const BoxDetails = dynamic(() => import("./BoxDetails"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
});

export default function BoxDetailsWrapper({ initialBox }: { initialBox: Box }) {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
  }, []);

  const memoizedBoxDetails = useMemo(() => {
    return <BoxDetails key={initialBox.id} initialBox={initialBox} />;
  }, [initialBox]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      {memoizedBoxDetails}
    </Suspense>
  );
}
