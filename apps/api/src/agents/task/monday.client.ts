// enterprise-ai-agent-platform/apps/api/src/agents/task/monday.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  workspace_id?: string;
  board_kind: 'private' | 'share' | 'public';
  state: 'active' | 'archived' | 'deleted';
  permissions: 'private' | 'share' | 'public';
  columns: MondayColumn[];
  groups: MondayGroup[];
  items: MondayItem[];
  owner?: MondayUser;
  subscribers?: MondayUser[];
  top_group?: MondayGroup;
  created_at?: string;
  updated_at?: string;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
  width?: number;
  archived?: boolean;
}

export interface MondayGroup {
  id: string;
  title: string;
  color?: string;
  position: string;
  archived: boolean;
  items_count?: number;
}

export interface MondayItem {
  id: string;
  name: string;
  board: { id: string; name?: string };
  group: { id: string; title: string };
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
  state: 'active' | 'archived' | 'deleted';
  parent_item?: { id: string };
  subitems?: MondayItem[];
  creator?: MondayUser;
  subscribers?: MondayUser[];
  assets?: MondayAsset[];
}

export interface MondayColumnValue {
  id: string;
  value: any;
  text: string;
  type: string;
  column?: { id: string; title: string; type: string };
}

export interface MondayUser {
  id: string;
  name: string;
  email: string;
  photo_thumb?: string;
  photo_small?: string;
  photo_original?: string;
  created_at: string;
  is_guest: boolean;
  is_pending: boolean;
  is_view_only: boolean;
  is_verified: boolean;
  enabled: boolean;
  account?: {
    id: string;
    name: string;
  };
  teams?: MondayTeam[];
  title?: string;
  phone?: string;
  location?: string;
  birthday?: string;
  url?: string;
}

export interface MondayTeam {
  id: string;
  name: string;
  picture_url?: string;
}

export interface MondayAsset {
  id: string;
  name: string;
  url: string;
  url_thumbnail?: string;
  public_url: string;
  file_size: number;
  file_extension: string;
  created_at: string;
  uploaded_by: { id: string; name: string };
}

export interface MondayCreateItemOptions {
  boardId: string;
  itemName: string;
  columnValues?: Record<string, any>;
  groupId?: string;
  createLabelsIfMissing?: boolean;
}

export interface MondayUpdateItemOptions {
  itemId: string;
  columnValues: Record<string, any>;
  createLabelsIfMissing?: boolean;
}

export interface MondayWorkspace {
  id: string;
  name: string;
  description?: string;
  kind: 'open' | 'closed';
  state: 'active' | 'archived' | 'deleted';
  created_at: string;
  owner?: MondayUser;
}

export class MondayClient {
  private client: AxiosInstance | null = null;
  private apiKey: string = '';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.monday.apiUrl,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'API-Version': '2023-10',
      },
      timeout: apiConfig.timeouts.default,
    });

    this.client.interceptors.request.use(
      (config) => {
        const query = config.data?.query;
        const queryPreview = query ? query.substring(0, 100).replace(/\s+/g, ' ') : 'unknown';
        logger.debug({ queryPreview }, 'Monday.com API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status }, 'Monday.com API response');
        
        // Check for GraphQL errors
        if (response.data?.errors) {
          const errors = response.data.errors;
          logger.error({ errors }, 'Monday.com GraphQL errors');
          const error = new Error(errors[0]?.message || 'GraphQL request failed');
          (error as any).graphqlErrors = errors;
          throw error;
        }
        
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Monday.com API key invalid');
        } else if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          logger.warn({ retryAfter }, 'Monday.com rate limit exceeded');
        } else if (error.response?.status === 500) {
          logger.error('Monday.com internal server error');
        }
        throw error;
      }
    );
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const axiosError = error as AxiosError;
          let delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          
          if (axiosError.response?.status === 429) {
            const retryAfter = axiosError.response.headers['retry-after'];
            delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          }
          
          // Check if it's a complexity limit error
          if ((error as any)?.graphqlErrors?.[0]?.message?.includes('complexity')) {
            delay = delay * 3; // Wait longer for complexity limits
            logger.warn('Monday.com complexity limit hit, waiting longer');
          }
          
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Monday.com API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  /**
   * Execute a GraphQL query
   */
  private async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.post('', {
        query,
        variables: variables || {},
      });
      
      return response.data.data as T;
    }, 'graphql');
  }

  async getBoards(limit: number = 20, page: number = 1): Promise<MondayBoard[]> {
    const query = `
      query GetBoards($limit: Int!, $page: Int!) {
        boards(limit: $limit, page: $page) {
          id
          name
          description
          board_kind
          state
          permissions
          owner {
            id
            name
            email
          }
          columns {
            id
            title
            type
          }
          groups {
            id
            title
            color
            position
            archived
          }
          created_at
          updated_at
        }
      }
    `;
    const data = await this.graphql<{ boards: MondayBoard[] }>(query, { limit, page });
    return data.boards || [];
  }

  async getBoard(boardId: string): Promise<MondayBoard> {
    const query = `
      query GetBoard($boardId: ID!) {
        boards(ids: [$boardId]) {
          id
          name
          description
          board_kind
          state
          permissions
          owner {
            id
            name
            email
          }
          columns {
            id
            title
            type
            settings_str
          }
          groups {
            id
            title
            color
            position
            archived
          }
          created_at
          updated_at
          top_group {
            id
            title
          }
        }
      }
    `;
    const data = await this.graphql<{ boards: MondayBoard[] }>(query, { boardId });
    return data.boards?.[0] || null as any;
  }

  async getItems(boardId: string, limit: number = 50, groupId?: string, page: number = 1): Promise<MondayItem[]> {
    const query = `
      query GetItems($boardId: ID!, $limit: Int!, $groupId: ID, $page: Int!) {
        items_page(limit: $limit, page: $page, board_id: $boardId, group_id: $groupId) {
          items {
            id
            name
            board {
              id
            }
            group {
              id
              title
            }
            column_values {
              id
              value
              text
              type
            }
            created_at
            updated_at
            state
            parent_item {
              id
            }
            subitems {
              id
              name
              state
              column_values {
                id
                value
                text
                type
              }
            }
          }
        }
      }
    `;
    const data = await this.graphql<{ items_page: { items: MondayItem[] } }>(query, { boardId, limit, groupId, page });
    return data.items_page?.items || [];
  }

  async getItem(itemId: string): Promise<MondayItem> {
    const query = `
      query GetItem($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          board {
            id
            name
          }
          group {
            id
            title
          }
          column_values {
            id
            value
            text
            type
            column {
              id
              title
              type
            }
          }
          created_at
          updated_at
          state
          parent_item {
            id
            name
          }
          subitems {
            id
            name
            state
            column_values {
              id
              value
              text
              type
            }
          }
          creator {
            id
            name
            email
          }
          assets {
            id
            name
            url
            public_url
            file_size
            file_extension
            created_at
          }
        }
      }
    `;
    const data = await this.graphql<{ items: MondayItem[] }>(query, { itemId });
    return data.items?.[0] || null as any;
  }

  async createItem(options: MondayCreateItemOptions): Promise<MondayItem> {
    const mutation = `
      mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON, $groupId: ID, $createLabelsIfMissing: Boolean) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues,
          group_id: $groupId,
          create_labels_if_missing: $createLabelsIfMissing
        ) {
          id
          name
          board {
            id
          }
          group {
            id
            title
          }
          column_values {
            id
            value
            text
            type
          }
          created_at
          state
          creator {
            id
            name
          }
        }
      }
    `;

    const variables = {
      boardId: options.boardId,
      itemName: options.itemName,
      columnValues: options.columnValues ? JSON.stringify(options.columnValues) : null,
      groupId: options.groupId || null,
      createLabelsIfMissing: options.createLabelsIfMissing ?? true,
    };

    const data = await this.graphql<{ create_item: MondayItem }>(mutation, variables);
    return data.create_item;
  }

  async updateItem(options: MondayUpdateItemOptions): Promise<MondayItem> {
    const mutation = `
      mutation UpdateItem($itemId: ID!, $columnValues: JSON!, $createLabelsIfMissing: Boolean) {
        change_multiple_column_values(
          item_id: $itemId,
          column_values: $columnValues,
          create_labels_if_missing: $createLabelsIfMissing
        ) {
          id
          name
          column_values {
            id
            value
            text
            type
          }
          updated_at
          state
        }
      }
    `;

    const variables = {
      itemId: options.itemId,
      columnValues: JSON.stringify(options.columnValues),
      createLabelsIfMissing: options.createLabelsIfMissing ?? true,
    };

    const data = await this.graphql<{ change_multiple_column_values: MondayItem }>(mutation, variables);
    return data.change_multiple_column_values;
  }

  async archiveItem(itemId: string): Promise<MondayItem> {
    const mutation = `
      mutation ArchiveItem($itemId: ID!) {
        archive_item(item_id: $itemId) {
          id
          name
          state
        }
      }
    `;
    const data = await this.graphql<{ archive_item: MondayItem }>(mutation, { itemId });
    return data.archive_item;
  }

  async deleteItem(itemId: string): Promise<{ id: string }> {
    const mutation = `
      mutation DeleteItem($itemId: ID!) {
        delete_item(item_id: $itemId) {
          id
        }
      }
    `;
    const data = await this.graphql<{ delete_item: { id: string } }>(mutation, { itemId });
    return data.delete_item;
  }

  async createSubitem(parentItemId: string, itemName: string, columnValues?: Record<string, any>): Promise<MondayItem> {
    const mutation = `
      mutation CreateSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON) {
        create_subitem(
          parent_item_id: $parentItemId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
          parent_item {
            id
          }
          column_values {
            id
            value
            text
            type
          }
          created_at
          state
        }
      }
    `;

    const variables = {
      parentItemId,
      itemName,
      columnValues: columnValues ? JSON.stringify(columnValues) : null,
    };

    const data = await this.graphql<{ create_subitem: MondayItem }>(mutation, variables);
    return data.create_subitem;
  }

  async getGroups(boardId: string): Promise<MondayGroup[]> {
    const query = `
      query GetGroups($boardId: ID!) {
        boards(ids: [$boardId]) {
          groups {
            id
            title
            color
            position
            archived
            items_count
          }
        }
      }
    `;
    const data = await this.graphql<{ boards: Array<{ groups: MondayGroup[] }> }>(query, { boardId });
    return data.boards?.[0]?.groups || [];
  }

  async createGroup(boardId: string, groupName: string, color?: string): Promise<MondayGroup> {
    const mutation = `
      mutation CreateGroup($boardId: ID!, $groupName: String!, $color: String) {
        create_group(board_id: $boardId, group_name: $groupName, group_color: $color) {
          id
          title
          color
          position
        }
      }
    `;
    const data = await this.graphql<{ create_group: MondayGroup }>(mutation, { boardId, groupName, color });
    return data.create_group;
  }

  async archiveGroup(boardId: string, groupId: string): Promise<MondayGroup> {
    const mutation = `
      mutation ArchiveGroup($boardId: ID!, $groupId: ID!) {
        archive_group(board_id: $boardId, group_id: $groupId) {
          id
          title
          archived
        }
      }
    `;
    const data = await this.graphql<{ archive_group: MondayGroup }>(mutation, { boardId, groupId });
    return data.archive_group;
  }

  async deleteGroup(boardId: string, groupId: string): Promise<{ id: string }> {
    const mutation = `
      mutation DeleteGroup($boardId: ID!, $groupId: ID!) {
        delete_group(board_id: $boardId, group_id: $groupId) {
          id
        }
      }
    `;
    const data = await this.graphql<{ delete_group: { id: string } }>(mutation, { boardId, groupId });
    return data.delete_group;
  }

  async getUsers(limit: number = 50): Promise<MondayUser[]> {
    const query = `
      query GetUsers($limit: Int!) {
        users(limit: $limit) {
          id
          name
          email
          photo_thumb
          photo_small
          created_at
          is_guest
          is_pending
          is_view_only
          is_verified
          enabled
          title
          phone
          location
          birthday
          url
          teams {
            id
            name
          }
        }
      }
    `;
    const data = await this.graphql<{ users: MondayUser[] }>(query, { limit });
    return data.users || [];
  }

  async getCurrentUser(): Promise<MondayUser> {
    const query = `
      query GetCurrentUser {
        me {
          id
          name
          email
          photo_thumb
          photo_small
          created_at
          is_guest
          is_pending
          is_verified
          enabled
          title
          phone
          location
          url
          account {
            id
            name
          }
          teams {
            id
            name
          }
        }
      }
    `;
    const data = await this.graphql<{ me: MondayUser }>(query);
    return data.me;
  }

  async getColumns(boardId: string): Promise<MondayColumn[]> {
    const query = `
      query GetColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
            settings_str
            width
            archived
          }
        }
      }
    `;
    const data = await this.graphql<{ boards: Array<{ columns: MondayColumn[] }> }>(query, { boardId });
    return data.boards?.[0]?.columns || [];
  }

  async getWorkspaces(): Promise<MondayWorkspace[]> {
    const query = `
      query GetWorkspaces {
        workspaces {
          id
          name
          description
          kind
          state
          created_at
          owner {
            id
            name
            email
          }
        }
      }
    `;
    const data = await this.graphql<{ workspaces: MondayWorkspace[] }>(query);
    return data.workspaces || [];
  }

  async searchItems(boardId: string, searchTerm: string, limit: number = 50): Promise<MondayItem[]> {
    const query = `
      query SearchItems($boardId: ID!, $searchTerm: String!, $limit: Int!) {
        items_page_by_column_values(
          limit: $limit,
          board_id: $boardId,
          columns: [{column_id: "name", column_values: [$searchTerm]}]
        ) {
          items {
            id
            name
            column_values {
              id
              value
              text
              type
            }
            group {
              id
              title
            }
            state
          }
        }
      }
    `;
    const data = await this.graphql<{ items_page_by_column_values: { items: MondayItem[] } }>(
      query, 
      { boardId, searchTerm, limit }
    );
    return data.items_page_by_column_values?.items || [];
  }

  async duplicateItem(boardId: string, itemId: string): Promise<MondayItem> {
    const mutation = `
      mutation DuplicateItem($boardId: ID!, $itemId: ID!) {
        duplicate_item(board_id: $boardId, item_id: $itemId) {
          id
          name
          board {
            id
          }
          group {
            id
            title
          }
          created_at
        }
      }
    `;
    const data = await this.graphql<{ duplicate_item: MondayItem }>(mutation, { boardId, itemId });
    return data.duplicate_item;
  }

  async moveItemToGroup(itemId: string, groupId: string): Promise<MondayItem> {
    const mutation = `
      mutation MoveItemToGroup($itemId: ID!, $groupId: ID!) {
        move_item_to_group(item_id: $itemId, group_id: $groupId) {
          id
          name
          group {
            id
            title
          }
        }
      }
    `;
    const data = await this.graphql<{ move_item_to_group: MondayItem }>(mutation, { itemId, groupId });
    return data.move_item_to_group;
  }

  async addSubscribersToBoard(boardId: string, userIds: string[]): Promise<Array<{ id: string }>> {
    const mutation = `
      mutation AddSubscribersToBoard($boardId: ID!, $userIds: [ID!]!) {
        add_subscribers_to_board(board_id: $boardId, user_ids: $userIds) {
          id
        }
      }
    `;
    const data = await this.graphql<{ add_subscribers_to_board: Array<{ id: string }> }>(
      mutation,
      { boardId, userIds }
    );
    return data.add_subscribers_to_board || [];
  }

  async addFileToColumn(itemId: string, columnId: string, file: { url?: string; text?: string }): Promise<MondayAsset> {
    const mutation = `
      mutation AddFileToColumn($itemId: ID!, $columnId: String!, $file: FileInput!) {
        add_file_to_column(
          item_id: $itemId,
          column_id: $columnId,
          file: $file
        ) {
          id
          name
          url
          public_url
          file_size
          file_extension
          created_at
        }
      }
    `;
    const data = await this.graphql<{ add_file_to_column: MondayAsset }>(mutation, { itemId, columnId, file });
    return data.add_file_to_column;
  }

  async updateMultipleColumnValues(boardId: string, itemId: string, columnValues: Record<string, any>): Promise<MondayItem> {
    const mutation = `
      mutation UpdateMultipleColumnValues($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
          name
          column_values {
            id
            value
            text
            type
          }
          updated_at
        }
      }
    `;
    const data = await this.graphql<{ change_multiple_column_values: MondayItem }>(
      mutation,
      { boardId, itemId, columnValues: JSON.stringify(columnValues) }
    );
    return data.change_multiple_column_values;
  }

  async batchCreateItems(boardId: string, items: Array<{ name: string; columnValues?: Record<string, any>; groupId?: string }>): Promise<MondayItem[]> {
    const results: MondayItem[] = [];
    
    for (const item of items) {
      try {
        const created = await this.createItem({
          boardId,
          itemName: item.name,
          columnValues: item.columnValues,
          groupId: item.groupId,
        });
        results.push(created);
      } catch (error) {
        logger.error({ error, itemName: item.name }, 'Failed to create item in batch');
      }
    }
    
    return results;
  }

  async clearBoard(boardId: string): Promise<void> {
    try {
      const items = await this.getItems(boardId, 100);
      const activeItems = items.filter(item => item.state === 'active');
      
      // Delete in batches of 10
      for (let i = 0; i < activeItems.length; i += 10) {
        const batch = activeItems.slice(i, i + 10);
        await Promise.all(batch.map(item => this.deleteItem(item.id).catch(e => 
          logger.warn({ error: e, itemId: item.id }, 'Failed to delete item during clear')
        )));
      }
    } catch (error) {
      logger.error({ error, boardId }, 'Failed to clear board');
      throw error;
    }
  }

  async getItemUpdates(boardId: string, since?: string): Promise<MondayItem[]> {
    const query = `
      query GetItemUpdates($boardId: ID!, $since: ISO8601DateTime) {
        boards(ids: [$boardId]) {
          items(updated_at: {gt: $since}) {
            id
            name
            state
            updated_at
            column_values {
              id
              value
              text
              type
            }
            group {
              id
              title
            }
          }
        }
      }
    `;
    const data = await this.graphql<{ boards: Array<{ items: MondayItem[] }> }>(query, { boardId, since });
    return data.boards?.[0]?.items || [];
  }

  async createBoard(boardName: string, boardKind: 'public' | 'private' | 'share' = 'public', workspaceId?: string): Promise<MondayBoard> {
    const mutation = `
      mutation CreateBoard($boardName: String!, $boardKind: BoardKind!, $workspaceId: ID) {
        create_board(
          board_name: $boardName,
          board_kind: $boardKind,
          workspace_id: $workspaceId
        ) {
          id
          name
          board_kind
          state
          permissions
          owner {
            id
            name
          }
          created_at
        }
      }
    `;
    const data = await this.graphql<{ create_board: MondayBoard }>(mutation, { boardName, boardKind, workspaceId });
    return data.create_board;
  }

  async createColumn(boardId: string, title: string, columnType: string, defaults?: Record<string, any>): Promise<MondayColumn> {
    const mutation = `
      mutation CreateColumn($boardId: ID!, $title: String!, $columnType: ColumnType!, $defaults: JSON) {
        create_column(
          board_id: $boardId,
          title: $title,
          column_type: $columnType,
          defaults: $defaults
        ) {
          id
          title
          type
        }
      }
    `;
    const data = await this.graphql<{ create_column: MondayColumn }>(mutation, { boardId, title, columnType, defaults });
    return data.create_column;
  }
}