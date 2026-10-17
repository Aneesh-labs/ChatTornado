/**
 * hubService.js
 * Manages the Living Co-Op Space (Split Bill Ledger, Shared To-Do Checklist, Event Countdown)
 * Persisted per conversation and synced across participants.
 */

const STORAGE_PREFIX = "vortex_hub_";

const getHubKey = (conversationId) => `${STORAGE_PREFIX}${conversationId}`;

export const getHubData = (conversationId) => {
    if (!conversationId) return { expenses: [], todos: [], countdown: null };
    try {
        const raw = localStorage.getItem(getHubKey(conversationId));
        if (!raw) return { expenses: [], todos: [], countdown: null };
        const parsed = JSON.parse(raw);
        return {
            expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
            todos: Array.isArray(parsed.todos) ? parsed.todos : [],
            countdown: parsed.countdown || null,
        };
    } catch (err) {
        console.warn("Failed to read hub data", err);
        return { expenses: [], todos: [], countdown: null };
    }
};

export const saveHubData = (conversationId, data) => {
    if (!conversationId) return;
    try {
        localStorage.setItem(getHubKey(conversationId), JSON.stringify(data));
        window.dispatchEvent(new CustomEvent("vortex_hub_updated", { detail: { conversationId, data } }));
    } catch (err) {
        console.warn("Failed to save hub data", err);
    }
};

/* ── Expenses & Bill Splitter ──────────────────────────────────────────────── */
export const addExpense = (conversationId, { title, amount, paidBy, splitBetween = [] }) => {
    const hub = getHubData(conversationId);
    const newExpense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim() || "Shared Expense",
        amount: Number(amount) || 0,
        paidBy: paidBy || "You",
        splitBetween: splitBetween.length > 0 ? splitBetween : ["You", "Friend"],
        createdAt: new Date().toISOString(),
    };
    hub.expenses.unshift(newExpense);
    saveHubData(conversationId, hub);
    return hub;
};

export const deleteExpense = (conversationId, expenseId) => {
    const hub = getHubData(conversationId);
    hub.expenses = hub.expenses.filter((e) => e.id !== expenseId);
    saveHubData(conversationId, hub);
    return hub;
};

export const clearExpenses = (conversationId) => {
    const hub = getHubData(conversationId);
    hub.expenses = [];
    saveHubData(conversationId, hub);
    return hub;
};

export const calculateBalances = (expenses = [], myName = "You", partnerName = "Friend") => {
    let myPaidTotal = 0;
    let partnerPaidTotal = 0;
    let totalSpent = 0;

    expenses.forEach((e) => {
        const amt = Number(e.amount) || 0;
        totalSpent += amt;
        const isMyPayment = e.paidBy === myName || e.paidBy === "You";
        if (isMyPayment) {
            myPaidTotal += amt;
        } else {
            partnerPaidTotal += amt;
        }
    });

    // Simple 50/50 split default
    const half = totalSpent / 2;
    const net = myPaidTotal - half; // Positive = partner owes me, Negative = I owe partner

    return {
        totalSpent,
        myPaidTotal,
        partnerPaidTotal,
        net,
        summaryText:
            totalSpent === 0
                ? "All settled up!"
                : net > 0
                ? `${partnerName} owes you ₹${Math.round(net)}`
                : net < 0
                ? `You owe ${partnerName} ₹${Math.round(Math.abs(net))}`
                : "Balances are even!",
    };
};

/* ── Shared To-Do Checklist ────────────────────────────────────────────────── */
export const addTodo = (conversationId, text, creator = "You") => {
    if (!text || !text.trim()) return getHubData(conversationId);
    const hub = getHubData(conversationId);
    const newTodo = {
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: text.trim(),
        done: false,
        createdBy: creator,
        createdAt: new Date().toISOString(),
    };
    hub.todos.push(newTodo);
    saveHubData(conversationId, hub);
    return hub;
};

export const toggleTodo = (conversationId, todoId, toggledBy = "You") => {
    const hub = getHubData(conversationId);
    hub.todos = hub.todos.map((t) =>
        t.id === todoId
            ? { ...t, done: !t.done, completedBy: !t.done ? toggledBy : null, completedAt: !t.done ? new Date().toISOString() : null }
            : t
    );
    saveHubData(conversationId, hub);
    return hub;
};

export const deleteTodo = (conversationId, todoId) => {
    const hub = getHubData(conversationId);
    hub.todos = hub.todos.filter((t) => t.id !== todoId);
    saveHubData(conversationId, hub);
    return hub;
};

/* ── Event Countdown ───────────────────────────────────────────────────────── */
export const setCountdown = (conversationId, { title, targetDate }) => {
    const hub = getHubData(conversationId);
    hub.countdown = {
        title: title.trim() || "Upcoming Event",
        targetDate: new Date(targetDate).toISOString(),
        createdAt: new Date().toISOString(),
    };
    saveHubData(conversationId, hub);
    return hub;
};

export const clearCountdown = (conversationId) => {
    const hub = getHubData(conversationId);
    hub.countdown = null;
    saveHubData(conversationId, hub);
    return hub;
};
