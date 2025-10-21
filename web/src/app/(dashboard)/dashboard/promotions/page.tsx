"use client";

import { useAuth } from "@/app/context/auth";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- TYPE DEFINITIONS ---
type Website = {
  website_id: string;
  domain_name: string;
};

type Promotion = {
  status: "active" | "completed" | "inactive" | "processing";
  budget: string;
  credits_spent: string;
};

type Article = {
  content_id: string;
  title: string;
  promotions: Promotion[];
};

type ArticlesByWebsite = {
  [key: string]: Article[];
};

// --- COMPONENT ---
export default function PromotionsPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();

  // --- State Management ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(
    null
  );
  const [websites, setWebsites] = useState<Website[]>([]);
  const [articles, setArticles] = useState<ArticlesByWebsite>({});
  const [isLoading, setIsLoading] = useState({
    auth: true, // Initial auth check
    websites: false,
    articles: false,
    submission: false,
  });
  const [error, setError] = useState<string | null>(null);

  // --- Authentication Hook ---
  useEffect(() => {
    console.log("[Auth] Checking auth status...", { loading, user });
    if (!loading && !user) {
      console.log("[Auth] User not found, redirecting to /login");
      router.push("/login");
    }
    if (!loading) {
      console.log("[Auth] Auth check complete.");
      setIsLoading((prev) => ({ ...prev, auth: false }));
    }
  }, [user, loading, router]);

  // --- Data Fetching ---
  const fetchArticlesForWebsite = async (websiteId: string) => {
    console.log(`[Fetch Articles] Fetching for websiteId: ${websiteId}`);
    setIsLoading((prev) => ({ ...prev, articles: true }));
    try {
      const response = await fetch(
        `/api/dashboard/articles?websiteId=${websiteId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch articles.");
      }
      const data = await response.json();

      // --- 👇 NEW EASY-TO-READ LOG ---
      console.log(`--- 2. ARTICLES DATA RECEIVED for website ${websiteId} ---`);
      console.log(
        "Look at the 'id' column in the table below. Are any IDs duplicated or missing (null)?"
      );
      console.table(data);
      // --- 👆 END OF NEW LOG ---

      setArticles((prev) => ({ ...prev, [websiteId]: data }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred fetching articles";
      console.error("[Fetch Articles] Error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, articles: false }));
    }
  };

  useEffect(() => {
    const fetchWebsites = async () => {
      if (!session) {
        console.log("[Fetch Websites] No session, skipping fetch.");
        setIsLoading((prev) => ({ ...prev, websites: false }));
        return;
      }
      console.log("[Fetch Websites] Fetching websites...");
      setIsLoading((prev) => ({ ...prev, websites: true }));
      try {
        const response = await fetch("/api/websites");
        if (!response.ok) {
          throw new Error("Failed to fetch websites.");
        }
        const data = await response.json();

        // --- 👇 NEW EASY-TO-READ LOG ---
        console.log("--- 1. WEBSITES DATA RECEIVED ---");
        console.log(
          "Look at the 'website_id' column in the table below. Are any IDs duplicated or missing (null)?"
        );
        console.table(data);
        // --- 👆 END OF NEW LOG ---

        setWebsites(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        console.error("[Fetch Websites] Error:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading((prev) => ({ ...prev, websites: false }));
      }
    };

    if (user) {
      console.log("[Auth] User exists, attempting to fetch websites.");
      fetchWebsites();
    }
  }, [session, user]);

  // --- Event Handlers ---
  const handleWebsiteSelect = (websiteId: string) => {
    const newSelectedId = selectedWebsiteId === websiteId ? null : websiteId;
    console.log(`[Event] Website selected. ID: ${newSelectedId}`);
    setSelectedWebsiteId(newSelectedId);

    if (newSelectedId && !articles[newSelectedId]) {
      console.log(`[Event] No local articles for ${newSelectedId}, fetching...`);
      fetchArticlesForWebsite(newSelectedId);
    }
  };

  const handlePromotionSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!selectedArticle || !selectedWebsiteId) {
      console.error("[Submit] Missing article or websiteId.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const budget = formData.get("budget");
    const payload = {
      content_id: selectedArticle.content_id,
      budget: Number(budget),
    };

    console.log("[Submit] Starting promotion with payload:", payload);
    setIsLoading((prev) => ({ ...prev, submission: true }));
    setError(null);

    try {
      const response = await fetch("/api/dashboard/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start promotion process.");
      }

      console.log("[Submit] Promotion job created successfully.");

      handleCloseModal();
      console.log("[Submit] Modal closed, refreshing articles list...");
      await fetchArticlesForWebsite(selectedWebsiteId);
      console.log("[Submit] Articles list refreshed.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("[Submit] Error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, submission: false }));
    }
  };

  const handlePromoteClick = (article: Article) => {
    console.log(
      "[Event] 'Promote' clicked. Article (content_id):",
      article.content_id
    );
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log("[Event] Closing modal.");
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  // --- Render Logic ---
  console.log("[Render] Component rendering with state:", {
    isLoading,
    user: !!user,
    error,
    selectedWebsiteId,
    // Note: Logging full 'websites' and 'articles' here is too noisy,
    // the console.table() logs are better.
  });

  if (isLoading.auth || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-background p-8 text-foreground">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Promotions</h1>
        <p className="mt-2 text-muted-foreground">
          Select a website to view its articles and manage promotions.
        </p>

        <div className="mt-8 space-y-4">
          {isLoading.websites && (
            <p className="text-muted-foreground">Loading websites...</p>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading.websites && !error && websites.length === 0 && (
            <p className="text-destructive">NO WEBSITES</p>
          )}

          {!isLoading.websites &&
            !error &&
            websites.map((website) => (
              <div
                key={website.website_id} // This key MUST be unique
                className="overflow-hidden rounded-lg bg-background border border-border"
              >
                <button
                  onClick={() => handleWebsiteSelect(website.website_id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-foreground">
                    {website.domain_name}
                  </span>
                  <span
                    className={`transform text-muted-foreground transition-transform duration-200 ${
                      selectedWebsiteId === website.website_id
                        ? "rotate-180"
                        : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {selectedWebsiteId === website.website_id && (
                  <div className="border-t border-border">
                    {isLoading.articles && (
                      <p className="p-4 text-muted-foreground">
                        Loading articles...
                      </p>
                    )}
                    {!isLoading.articles && (
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                              Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                              Budget / Spent
                            </th>
                            <th className="relative px-6 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-background">
                          {articles[website.website_id]?.map((item) => {
                            const promotion = item.promotions?.[0];
                            const status = promotion
                              ? promotion.status
                              : "not_promoted";
                            const budget = promotion ? promotion.budget : "0";
                            const spent = promotion
                              ? promotion.credits_spent
                              : "0";

                            return (
                              <tr key={item.content_id}>
                                {/* This key MUST be unique */}
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                                  {item.title}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                      status === "active"
                                        ? "bg-primary/20 text-primary"
                                        : status === "completed"
                                        ? "bg-muted text-muted-foreground"
                                        : status === "processing"
                                        ? "bg-blue-900/50 text-blue-300" // Style for processing
                                        : "bg-accent/20 text-accent-foreground"
                                    }`}
                                  >
                                    {status.replace("_", " ").toUpperCase()}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                                  ${parseFloat(budget).toFixed(2)} / $
                                  {parseFloat(spent).toFixed(2)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                  {status === "not_promoted" && (
                                    <button
                                      onClick={() => handlePromoteClick(item)}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      Promote
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl border border-border">
            <h2 className="text-xl font-bold text-card-foreground">
              Create Promotion
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You are promoting:{" "}
              <span className="font-semibold text-foreground">
                {selectedArticle?.title}
              </span>
            </p>
            <form onSubmit={handlePromotionSubmit} className="mt-4">
              <div>
                <label
                  htmlFor="budget"
                  className="block text-sm font-medium text-card-foreground"
                >
                  Budget (in Credits)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="budget"
                    id="budget"
                    className="block w-full rounded-md border border-border bg-input text-foreground shadow-sm focus:border-ring focus:ring-ring/50 sm:text-sm"
                    placeholder="e.g., 100"
                    min="1"
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              )}
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading.submission}
                  className="rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading.submission ? "Processing..." : "Start Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}