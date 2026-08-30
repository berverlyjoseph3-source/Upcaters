"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MondayClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/task/monday.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class MondayClient {
    constructor(apiKey) {
        this.client = null;
        this.apiKey = '';
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.apiKey = apiKey;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.monday.apiUrl,
            headers: {
                'Authorization': this.apiKey,
                'Content-Type': 'application/json',
                'API-Version': '2023-10',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            const query = config.data?.query;
            const queryPreview = query ? query.substring(0, 100).replace(/\s+/g, ' ') : 'unknown';
            logger_1.logger.debug({ queryPreview }, 'Monday.com API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status }, 'Monday.com API response');
            // Check for GraphQL errors
            if (response.data?.errors) {
                const errors = response.data.errors;
                logger_1.logger.error({ errors }, 'Monday.com GraphQL errors');
                const error = new Error(errors[0]?.message || 'GraphQL request failed');
                error.graphqlErrors = errors;
                throw error;
            }
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Monday.com API key invalid');
            }
            else if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                logger_1.logger.warn({ retryAfter }, 'Monday.com rate limit exceeded');
            }
            else if (error.response?.status === 500) {
                logger_1.logger.error('Monday.com internal server error');
            }
            throw error;
        });
    }
    /**
     * Retry wrapper for API calls
     */
    async retryRequest(fn, context) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.MAX_RETRIES) {
                    const axiosError = error;
                    let delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    if (axiosError.response?.status === 429) {
                        const retryAfter = axiosError.response.headers['retry-after'];
                        delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
                    }
                    // Check if it's a complexity limit error
                    if (error?.graphqlErrors?.[0]?.message?.includes('complexity')) {
                        delay = delay * 3; // Wait longer for complexity limits
                        logger_1.logger.warn('Monday.com complexity limit hit, waiting longer');
                    }
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Monday.com API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    /**
     * Execute a GraphQL query
     */
    async graphql(query, variables) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('', {
                query,
                variables: variables || {},
            });
            return response.data.data;
        }, 'graphql');
    }
    async getBoards(limit = 20, page = 1) {
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
        const data = await this.graphql(query, { limit, page });
        return data.boards || [];
    }
    async getBoard(boardId) {
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
        const data = await this.graphql(query, { boardId });
        return data.boards?.[0] || null;
    }
    async getItems(boardId, limit = 50, groupId, page = 1) {
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
        const data = await this.graphql(query, { boardId, limit, groupId, page });
        return data.items_page?.items || [];
    }
    async getItem(itemId) {
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
        const data = await this.graphql(query, { itemId });
        return data.items?.[0] || null;
    }
    async createItem(options) {
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
        const data = await this.graphql(mutation, variables);
        return data.create_item;
    }
    async updateItem(options) {
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
        const data = await this.graphql(mutation, variables);
        return data.change_multiple_column_values;
    }
    async archiveItem(itemId) {
        const mutation = `
      mutation ArchiveItem($itemId: ID!) {
        archive_item(item_id: $itemId) {
          id
          name
          state
        }
      }
    `;
        const data = await this.graphql(mutation, { itemId });
        return data.archive_item;
    }
    async deleteItem(itemId) {
        const mutation = `
      mutation DeleteItem($itemId: ID!) {
        delete_item(item_id: $itemId) {
          id
        }
      }
    `;
        const data = await this.graphql(mutation, { itemId });
        return data.delete_item;
    }
    async createSubitem(parentItemId, itemName, columnValues) {
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
        const data = await this.graphql(mutation, variables);
        return data.create_subitem;
    }
    async getGroups(boardId) {
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
        const data = await this.graphql(query, { boardId });
        return data.boards?.[0]?.groups || [];
    }
    async createGroup(boardId, groupName, color) {
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
        const data = await this.graphql(mutation, { boardId, groupName, color });
        return data.create_group;
    }
    async archiveGroup(boardId, groupId) {
        const mutation = `
      mutation ArchiveGroup($boardId: ID!, $groupId: ID!) {
        archive_group(board_id: $boardId, group_id: $groupId) {
          id
          title
          archived
        }
      }
    `;
        const data = await this.graphql(mutation, { boardId, groupId });
        return data.archive_group;
    }
    async deleteGroup(boardId, groupId) {
        const mutation = `
      mutation DeleteGroup($boardId: ID!, $groupId: ID!) {
        delete_group(board_id: $boardId, group_id: $groupId) {
          id
        }
      }
    `;
        const data = await this.graphql(mutation, { boardId, groupId });
        return data.delete_group;
    }
    async getUsers(limit = 50) {
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
        const data = await this.graphql(query, { limit });
        return data.users || [];
    }
    async getCurrentUser() {
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
        const data = await this.graphql(query);
        return data.me;
    }
    async getColumns(boardId) {
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
        const data = await this.graphql(query, { boardId });
        return data.boards?.[0]?.columns || [];
    }
    async getWorkspaces() {
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
        const data = await this.graphql(query);
        return data.workspaces || [];
    }
    async searchItems(boardId, searchTerm, limit = 50) {
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
        const data = await this.graphql(query, { boardId, searchTerm, limit });
        return data.items_page_by_column_values?.items || [];
    }
    async duplicateItem(boardId, itemId) {
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
        const data = await this.graphql(mutation, { boardId, itemId });
        return data.duplicate_item;
    }
    async moveItemToGroup(itemId, groupId) {
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
        const data = await this.graphql(mutation, { itemId, groupId });
        return data.move_item_to_group;
    }
    async addSubscribersToBoard(boardId, userIds) {
        const mutation = `
      mutation AddSubscribersToBoard($boardId: ID!, $userIds: [ID!]!) {
        add_subscribers_to_board(board_id: $boardId, user_ids: $userIds) {
          id
        }
      }
    `;
        const data = await this.graphql(mutation, { boardId, userIds });
        return data.add_subscribers_to_board || [];
    }
    async addFileToColumn(itemId, columnId, file) {
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
        const data = await this.graphql(mutation, { itemId, columnId, file });
        return data.add_file_to_column;
    }
    async updateMultipleColumnValues(boardId, itemId, columnValues) {
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
        const data = await this.graphql(mutation, { boardId, itemId, columnValues: JSON.stringify(columnValues) });
        return data.change_multiple_column_values;
    }
    async batchCreateItems(boardId, items) {
        const results = [];
        for (const item of items) {
            try {
                const created = await this.createItem({
                    boardId,
                    itemName: item.name,
                    columnValues: item.columnValues,
                    groupId: item.groupId,
                });
                results.push(created);
            }
            catch (error) {
                logger_1.logger.error({ error, itemName: item.name }, 'Failed to create item in batch');
            }
        }
        return results;
    }
    async clearBoard(boardId) {
        try {
            const items = await this.getItems(boardId, 100);
            const activeItems = items.filter(item => item.state === 'active');
            // Delete in batches of 10
            for (let i = 0; i < activeItems.length; i += 10) {
                const batch = activeItems.slice(i, i + 10);
                await Promise.all(batch.map(item => this.deleteItem(item.id).catch(e => logger_1.logger.warn({ error: e, itemId: item.id }, 'Failed to delete item during clear'))));
            }
        }
        catch (error) {
            logger_1.logger.error({ error, boardId }, 'Failed to clear board');
            throw error;
        }
    }
    async getItemUpdates(boardId, since) {
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
        const data = await this.graphql(query, { boardId, since });
        return data.boards?.[0]?.items || [];
    }
    async createBoard(boardName, boardKind = 'public', workspaceId) {
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
        const data = await this.graphql(mutation, { boardName, boardKind, workspaceId });
        return data.create_board;
    }
    async createColumn(boardId, title, columnType, defaults) {
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
        const data = await this.graphql(mutation, { boardId, title, columnType, defaults });
        return data.create_column;
    }
}
exports.MondayClient = MondayClient;
//# sourceMappingURL=monday.client.js.map