/**
 * Verifies that the /admin/webhooks page never reveals any outgoing_url
 * value when the data layer behaves as it does for a non-admin user:
 *
 *  - Empty result set (RLS filters everything out)
 *  - Permission-style error (RLS denies / network error)
 *  - Partial rows that happen to have outgoing_url set to null
 *  - The inspect dialog is closed by default, so no URL content is mounted
 *
 * We mock the Supabase client at the module boundary so we can simulate each
 * scenario without hitting the network. The crucial assertion in every case
 * is that no rendered text contains the sentinel host strings or the
 * substring "https://" (proxy for any leaked URL).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---------------------------------------------------------------

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header-mock" />,
}));

// Header pulls in useAuth/useUnreadNotifications via real path; mocking the
// component above avoids needing those providers. The page itself does not
// use auth context directly.

type Scenario = "empty" | "error" | "null-url-rows";
let scenario: Scenario = "empty";

const VICTIM_HOST = "victim-host.example.test";
const VICTIM_URL = `https://${VICTIM_HOST}/secret-path`;

vi.mock("@/integrations/supabase/client", () => {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const webhookConfigsResult = () => {
    if (scenario === "error") {
      return { data: null, error: { message: "permission denied" } };
    }
    if (scenario === "null-url-rows") {
      // Rows the attacker "owns" — outgoing_url is null. The page must not
      // display anything that looks like a URL for these rows.
      return {
        data: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            user_id: "user-attacker",
            outgoing_url: null,
            secret_key: "asecasecasecasecasecasecasec",
            subscribed_events: [],
            is_enabled: true,
            retry_count: 3,
            timeout_seconds: 30,
            created_at: "2026-05-01T00:00:00.000Z",
            updated_at: "2026-05-02T00:00:00.000Z",
          },
        ],
        error: null,
      };
    }
    // "empty" — RLS filtered everything.
    return { data: [], error: null };
  };

  const builderFor = (table: string) => {
    if (table === "audit_logs") {
      return { insert: auditInsert };
    }
    if (table === "webhook_configs") {
      const builder: any = {
        select: vi.fn(() => builder),
        order: vi.fn(() => Promise.resolve(webhookConfigsResult())),
      };
      return builder;
    }
    if (table === "profiles") {
      const builder: any = {
        select: vi.fn(() => builder),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
      return builder;
    }
    return {};
  };

  return {
    supabase: {
      from: vi.fn((table: string) => builderFor(table)),
    },
  };
});

// Sonner toasts pull in DOM portals we don't need for these assertions.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// --- Helpers -------------------------------------------------------------

const renderPage = async () => {
  const { default: AdminWebhooks } = await import("./AdminWebhooks");
  return render(
    <MemoryRouter>
      <AdminWebhooks />
    </MemoryRouter>,
  );
};

const expectNoUrlLeak = (html: string) => {
  // Strip SVG xmlns attributes (http://www.w3.org/...) which are always
  // present in lucide icons and aren't user-controlled data.
  const cleaned = html.replace(/xmlns="[^"]*"/g, "");
  expect(cleaned).not.toContain(VICTIM_HOST);
  expect(cleaned).not.toContain(VICTIM_URL);
  expect(cleaned.toLowerCase()).not.toContain("https://victim");
  // After stripping xmlns, no http(s) URL should remain — that would indicate
  // a leaked outgoing_url surfaced via text, href, or any attribute.
  expect(cleaned).not.toMatch(/https?:\/\/[^\s"'<>]+/i);
};

// --- Tests ---------------------------------------------------------------

describe("AdminWebhooks – non-admin / restricted data paths", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders no outgoing_url when RLS returns an empty result set", async () => {
    scenario = "empty";
    const { container } = await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/0 destinations/i)).toBeInTheDocument();
    });

    expectNoUrlLeak(container.innerHTML);
    expect(
      screen.getByText(/No webhook destinations match this search\./i),
    ).toBeInTheDocument();
  });

  it("renders no outgoing_url on the error path (permission denied)", async () => {
    scenario = "error";
    const { container } = await renderPage();

    await waitFor(() => {
      // After the error, the table should fall through to the empty state.
      expect(screen.getByText(/0 destinations/i)).toBeInTheDocument();
    });

    expectNoUrlLeak(container.innerHTML);
  });

  it("does not render any URL for partial rows where outgoing_url is null", async () => {
    scenario = "null-url-rows";
    const { container } = await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/1 destination/i)).toBeInTheDocument();
    });

    // Host column shows the em-dash placeholder, never a host or URL.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expectNoUrlLeak(container.innerHTML);
  });

  it("keeps the inspect dialog closed by default so no detail URL is mounted", async () => {
    scenario = "null-url-rows";
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/1 destination/i)).toBeInTheDocument();
    });

    // The dialog body content is only rendered when `selected` is set.
    expect(screen.queryByText(/Webhook configuration details/i)).toBeNull();
    expect(screen.queryByText(/Outgoing URL/i)).toBeNull();
  });
});