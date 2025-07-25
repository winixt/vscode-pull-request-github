/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, Disposable, Event, Uri } from 'vscode';
import { APIState, PublishEvent } from '../@types/git';

export interface InputBox {
	value: string;
}

export { RefType } from './api1';

export interface Ref {
	readonly type: RefType;
	readonly name?: string;
	readonly commit?: string;
	readonly remote?: string;
}

export interface UpstreamRef {
	readonly remote: string;
	readonly name: string;
}

export interface Branch extends Ref {
	readonly upstream?: UpstreamRef;
	readonly ahead?: number;
	readonly behind?: number;
}

export interface Commit {
	readonly hash: string;
	readonly message: string;
	readonly parents: string[];
	readonly authorDate?: Date;
	readonly authorName?: string;
	readonly authorEmail?: string;
	readonly commitDate?: Date;
}

export interface Submodule {
	readonly name: string;
	readonly path: string;
	readonly url: string;
}

export interface Remote {
	readonly name: string;
	readonly fetchUrl?: string;
	readonly pushUrl?: string;
	readonly isReadOnly: boolean;
}

export { Status } from './api1';

export interface Change {
	/**
	 * Returns either `originalUri` or `renameUri`, depending
	 * on whether this change is a rename change. When
	 * in doubt always use `uri` over the other two alternatives.
	 */
	readonly uri: Uri;
	readonly originalUri: Uri;
	readonly renameUri: Uri | undefined;
	readonly status: Status;
}

export interface RepositoryState {
	readonly HEAD: Branch | undefined;
	readonly remotes: Remote[];
	readonly submodules: Submodule[];
	readonly rebaseCommit: Commit | undefined;

	readonly mergeChanges: Change[];
	readonly indexChanges: Change[];
	readonly workingTreeChanges: Change[];

	readonly onDidChange: Event<void>;
}

export interface RepositoryUIState {
	readonly selected: boolean;
	readonly onDidChange: Event<void>;
}

export interface CommitOptions {
	all?: boolean | 'tracked';
	amend?: boolean;
	signoff?: boolean;
	signCommit?: boolean;
	empty?: boolean;
}

export interface FetchOptions {
	remote?: string;
	ref?: string;
	all?: boolean;
	prune?: boolean;
	depth?: number;
}

export interface RefQuery {
	readonly contains?: string;
	readonly count?: number;
	readonly pattern?: string;
	readonly sort?: 'alphabetically' | 'committerdate';
}

export interface BranchQuery extends RefQuery {
	readonly remote?: boolean;
}

export interface Repository {
	readonly inputBox: InputBox;
	readonly rootUri: Uri;
	readonly state: RepositoryState;
	readonly ui: RepositoryUIState;

	/**
	 * GH PR saves pull request related information to git config when users checkout a pull request.
	 * There are two mandatory config for a branch
	 * 1. `remote`, which refers to the related github repository
	 * 2. `github-pr-owner-number`, which refers to the related pull request
	 *
	 * There is one optional config for a remote
	 * 1. `github-pr-remote`, which indicates if the remote is created particularly for GH PR review. By default, GH PR won't load pull requests from remotes created by itself (`github-pr-remote=true`).
	 *
	 * Sample config:
	 * ```git
	 * [remote "pr"]
	 * url = https://github.com/pr/vscode-pull-request-github
	 * fetch = +refs/heads/*:refs/remotes/pr/*
	 * github-pr-remote = true
	 * [branch "fix-123"]
	 * remote = pr
	 * merge = refs/heads/fix-123
	 * github-pr-owner-number = "Microsoft#vscode-pull-request-github#123"
	 * ```
	 */
	getConfigs(): Promise<{ key: string; value: string }[]>;

	/**
	 * Git providers are recommended to implement a minimal key value lookup for git config but you can only provide config for following keys to activate GH PR successfully
	 * 1. `branch.${branchName}.github-pr-owner-number`
	 * 2. `remote.${remoteName}.github-pr-remote`
	 * 3. `branch.${branchName}.remote`
	 */
	getConfig(key: string): Promise<string>;

	/**
	 * The counterpart of `getConfig`
	 */
	setConfig(key: string, value: string): Promise<string>;
	unsetConfig?(key: string): Promise<string>;
	getGlobalConfig(key: string): Promise<string>;

	getObjectDetails(treeish: string, path: string): Promise<{ mode: string; object: string; size: number }>;
	detectObjectType(object: string): Promise<{ mimetype: string; encoding?: string }>;
	buffer(ref: string, path: string): Promise<Buffer>;
	show(ref: string, path: string): Promise<string>;
	getCommit(ref: string): Promise<Commit>;

	clean(paths: string[]): Promise<void>;

	apply(patch: string, reverse?: boolean): Promise<void>;
	diff(cached?: boolean): Promise<string>;
	diffWithHEAD(): Promise<Change[]>;
	diffWithHEAD(path: string): Promise<string>;
	diffWith(ref: string): Promise<Change[]>;
	diffWith(ref: string, path: string): Promise<string>;
	diffIndexWithHEAD(): Promise<Change[]>;
	diffIndexWithHEAD(path: string): Promise<string>;
	diffIndexWith(ref: string): Promise<Change[]>;
	diffIndexWith(ref: string, path: string): Promise<string>;
	diffBlobs(object1: string, object2: string): Promise<string>;
	diffBetween(ref1: string, ref2: string): Promise<Change[]>;
	diffBetween(ref1: string, ref2: string, path: string): Promise<string>;

	hashObject(data: string): Promise<string>;

	createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
	deleteBranch(name: string, force?: boolean): Promise<void>;
	getBranch(name: string): Promise<Branch>;
	getBranches(query: BranchQuery): Promise<Ref[]>;
	getBranchBase(name: string): Promise<Branch | undefined>;
	setBranchUpstream(name: string, upstream: string): Promise<void>;
	getRefs?(query: RefQuery, cancellationToken?: CancellationToken): Promise<Ref[]>; // Optional, because Remote Hub doesn't support this

	getMergeBase(ref1: string, ref2: string): Promise<string>;

	status(): Promise<void>;
	checkout(treeish: string): Promise<void>;

	addRemote(name: string, url: string): Promise<void>;
	removeRemote(name: string): Promise<void>;
	renameRemote(name: string, newName: string): Promise<void>;

	fetch(options?: FetchOptions): Promise<void>;
	fetch(remote?: string, ref?: string, depth?: number): Promise<void>;
	pull(unshallow?: boolean): Promise<void>;
	push(remoteName?: string, branchName?: string, setUpstream?: boolean): Promise<void>;

	blame(path: string): Promise<string>;
	log(options?: LogOptions): Promise<Commit[]>;

	commit(message: string, opts?: CommitOptions): Promise<void>;
	add(paths: string[]): Promise<void>;
	merge(ref: string): Promise<void>;
	mergeAbort(): Promise<void>;
}

/**
 * Log options.
 */
export interface LogOptions {
	/** Max number of log entries to retrieve. If not specified, the default is 32. */
	readonly maxEntries?: number;
	readonly path?: string;
	/** A commit range, such as "0a47c67f0fb52dd11562af48658bc1dff1d75a38..0bb4bdea78e1db44d728fd6894720071e303304f" */
	readonly range?: string;
}

export interface PostCommitCommandsProvider {
	getCommands(repository: Repository): Command[];
}

export { GitErrorCodes } from './api1';

export interface IGit {
	readonly repositories: Repository[];
	readonly onDidOpenRepository: Event<Repository>;
	readonly onDidCloseRepository: Event<Repository>;

	// Used by the actual git extension to indicate it has finished initializing state information
	readonly state?: APIState;
	readonly onDidChangeState?: Event<APIState>;
	readonly onDidPublish?: Event<PublishEvent>;

	registerPostCommitCommandsProvider?(provider: PostCommitCommandsProvider): Disposable;
}

export interface TitleAndDescriptionProvider {
	provideTitleAndDescription(context: { commitMessages: string[], patches: string[] | { patch: string, fileUri: string, previousFileUri?: string }[], issues?: { reference: string, content: string }[] }, token: CancellationToken): Promise<{ title: string, description?: string } | undefined>;
}

export interface ReviewerComments {
	// To tell which files we should add a comment icon in the "Files Changed" view
	files: Uri[];
	succeeded: boolean;
	// For removing comments
	disposable?: Disposable;
}

export interface ReviewerCommentsProvider {
	provideReviewerComments(context: { repositoryRoot: string, commitMessages: string[], patches: { patch: string, fileUri: string, previousFileUri?: string }[] }, token: CancellationToken): Promise<ReviewerComments>;
}

export interface RepositoryDescription {
	owner: string;
	repositoryName: string;
	defaultBranch: string;
	pullRequest?: {
		title: string;
		url: string;
		number: number;
		id: number;
	};
}

export interface API {
	/**
	 * Register a [git provider](#IGit)
	 */
	registerGitProvider(provider: IGit): Disposable;

	/**
	 * Returns the [git provider](#IGit) that contains a given uri.
	 *
	 * @param uri An uri.
	 * @return A git provider or `undefined`
	 */
	getGitProvider(uri: Uri): IGit | undefined;

	/**
	 * Register a PR title and description provider.
	 */
	registerTitleAndDescriptionProvider(title: string, provider: TitleAndDescriptionProvider): Disposable;

	/**
	 * Register a PR reviewer comments provider.
	 */
	registerReviewerCommentsProvider(title: string, provider: ReviewerCommentsProvider): Disposable;

	/**
	 * Get the repository description for a given URI, where the URI is a subpath of one of the workspace folders.
	 * This includes the owner, repository name, default branch,
	 * and pull request information (if applicable).
	 *
	 * @returns A promise that resolves to a `RepositoryDescription` object or `undefined` if no repository is found.
	 */
	getRepositoryDescription(uri: vscode.Uri): Promise<RepositoryDescription | undefined>;
}
