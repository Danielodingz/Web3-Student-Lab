//! # DAO Governance Error Definitions
//!
//! Standardized, typed, and documented contract errors for DAO governance,
//! voting, proposals, and voice credit operations.
//! Namespace: 400–499 (Governance).

use soroban_sdk::contracterror;

/// Typed, documented contract errors for the DAO governance contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DaoError {
    /// 401 — Contract has already been initialized.
    AlreadyInitialized = 401,
    /// 402 — Contract has not been initialized.
    NotInitialized = 402,
    /// 403 — Caller is not authorized for governance operation.
    Unauthorized = 403,
    /// 404 — Proposal was not found with specified identifier.
    ProposalNotFound = 404,
    /// 405 — Proposal is closed and not open for voting or execution.
    ProposalClosed = 405,
    /// 406 — Voting deadline is still live; premature finalization rejected.
    VotingDeadlineLive = 406,
    /// 407 — Voter has already cast votes on this proposal.
    AlreadyVoted = 407,
    /// 408 — Insufficient voice credits available to cast the requested votes.
    InsufficientCredits = 408,
    /// 409 — Number of votes must be strictly positive.
    ZeroVotes = 409,
    /// 410 — Proposal deadline is invalid or not in the future.
    InvalidDeadline = 410,
}
