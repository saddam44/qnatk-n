import { Injectable } from '@nestjs/common';
import { Model, Sequelize } from 'sequelize-typescript';
import { QnatkService } from './qnatk.service';
import { HooksService } from './hooks/hooks.service';
import { QnatkListDTO } from './dto/QnatkListDTO';
import { Transaction } from 'sequelize';

@Injectable()
export class QnatkControllerService {
    constructor(
        private readonly qnatkService: QnatkService,
        private readonly hooksService: HooksService,
        private sequelize: Sequelize,
    ) {}

    async list(
        baseModel: string,
        body: QnatkListDTO,
    ): Promise<Model<any, any>[]> {
        return await this.qnatkService.findAll(baseModel, body);
    }

    async listAndCount(baseModel: string, body: QnatkListDTO) {
        return {
            ...(await this.qnatkService.findAndCountAll(baseModel, body)),
            actions: await this.qnatkService.getActions(baseModel),
        };
    }

    async addNew<UserDTO = any>(
        baseModel: string,
        data: any,
        user: UserDTO,
        transaction?: Transaction,
    ) {
        const execute = async (t: Transaction) => {
            const validated_data = await this.hooksService.triggerHooks(
                `beforeCreate:${baseModel}`,
                { data, user },
                t,
            );

            const model_instance = await this.qnatkService.addNew(
                baseModel,
                validated_data.data,
                t,
            );

            return await this.hooksService.triggerHooks(
                `afterCreate:${baseModel}`,
                {
                    ...validated_data,
                    modelInstance: model_instance,
                },
                t,
            );
        };

        let final_data;
        if (transaction) {
            // Use the existing transaction
            final_data = await execute(transaction);
        } else {
            // Create a new transaction
            final_data = await this.sequelize.transaction(execute);
        }

        return {
            ...final_data,
            message: `Action executed successfully`,
        };
    }

    async addNewWithFile<UserDTO = any>(
        baseModel: string,
        data: any,
        files: Array<Express.Multer.File>,
        user: UserDTO,
        transaction?: Transaction, // Add an optional transaction parameter
    ) {
        const execute = async (t: Transaction) => {
            const validated_data = await this.hooksService.triggerHooks(
                `beforeCreate:${baseModel}`,
                { data, files, user },
                t,
            );

            console.log('validated_data', validated_data);

            const data_returned = await this.qnatkService.addNew(
                baseModel,
                validated_data.data,
                t,
            );

            return await this.hooksService.triggerHooks(
                `afterCreate:${baseModel}`,
                {
                    ...validated_data,
                    modelInstance: data_returned,
                },
                t,
            );
        };

        let final_data;
        if (transaction) {
            // Use the existing transaction
            final_data = await execute(transaction);
        } else {
            // Create a new transaction
            final_data = await this.sequelize
                .transaction(execute)
                .catch((err) => {
                    console.log(err);
                    throw err;
                });
        }

        return {
            ...final_data,
            message: `Action executed successfully`,
        };
    }

    async executeAction<UserDTO = any>(
        baseModel: string,
        action: any,
        data: any,
        user: UserDTO,
        transaction?: Transaction, // Add an optional transaction parameter
    ) {
        const execute = async (t: Transaction) => {
            console.log('before execute validated_data', data);

            const model_instance =
                await this.qnatkService.findOneFormActionInfo(
                    baseModel,
                    data.action,
                    data.record,
                    t,
                );

            const validated_data = await this.hooksService.triggerHooks(
                `before:${baseModel}:${action}`,
                { data, user, modelInstance: model_instance },
                t,
            );

            const executedData = await this.hooksService.triggerHooks(
                `execute:${baseModel}:${action}`,
                validated_data,
                t,
            );

            return await this.hooksService.triggerHooks(
                `after:${baseModel}:${action}`,
                executedData,
                t,
            );
        };

        let final_data;
        if (transaction) {
            // Use the existing transaction
            final_data = await execute(transaction);
        } else {
            // Create a new transaction
            final_data = await this.sequelize.transaction(execute);
        }

        return {
            ...final_data,
            modelInstance: data.action.returnModel
                ? final_data.modelInstance
                : undefined,
            data: undefined,
            user: undefined,
            message: `Action ${action} executed successfully`,
        };
    }

    async bulkExecuteAction<UserDTO = any>(
        baseModel: string,
        action: any,
        data: any,
        user: UserDTO,
        transaction?: Transaction, // Add an optional transaction parameter
    ) {
        const execute = async (t: Transaction) => {
            const validated_data = await this.hooksService.triggerHooks(
                `before:${baseModel}:bulk-${action}`,
                { data, user },
                t,
            );

            const model_instances =
                await this.qnatkService.findAllFormActionInfo(
                    baseModel,
                    validated_data.data.action,
                    validated_data,
                    t,
                );

            console.log('model_instances', model_instances);

            const executedData = await this.hooksService.triggerHooks(
                `execute:${baseModel}:bulk-${action}`,
                {
                    ...validated_data,
                    modelInstances: model_instances,
                },
                t,
            );

            return await this.hooksService.triggerHooks(
                `after:${baseModel}:bulk-${action}`,
                {
                    ...validated_data,
                    modelInstance: executedData,
                },
                t,
            );
        };

        let final_data;
        if (transaction) {
            // Use the existing transaction
            final_data = await execute(transaction);
        } else {
            // Create a new transaction
            final_data = await this.sequelize.transaction(execute);
        }

        return {
            ...final_data,
            modelInstance: data.action.returnModel
                ? final_data.modelInstance
                : undefined,
            data: undefined,
            user: undefined,
            message: `Action ${action} executed successfully`,
        };
    }

    async updateByPk<UserDTO = any>(
        baseModel: string,
        primaryKey: string | number,
        primaryField: string,
        data: any,
        user: UserDTO,
        transaction?: Transaction, // Add an optional transaction parameter
    ) {
        const execute = async (t: Transaction) => {
            const data_with_id = {
                ...data,
                primaryKey: primaryKey,
                primaryField: primaryField,
            };
            const validated_data = await this.hooksService.triggerHooks(
                `beforeEdit:${baseModel}`,
                { data: data_with_id, user },
                t,
            );

            const model_instance = await this.qnatkService.updateByPk(
                baseModel,
                primaryKey,
                primaryField,
                data,
                t,
            );

            return await this.hooksService.triggerHooks(
                `afterEdit:${baseModel}`,
                {
                    ...validated_data,
                    modelInstance: model_instance,
                },
                t,
            );
        };

        let final_data;
        if (transaction) {
            // Use the existing transaction
            final_data = await execute(transaction);
        } else {
            // Create a new transaction
            final_data = await this.sequelize.transaction(execute);
        }

        return {
            ...final_data,
            modelInstance: final_data.modelInstance,
            message: `Action Update executed successfully`,
        };
    }

    async deleteByPk<UserDTO = any>(
        baseModel: string,
        primaryKey: string | number,
        primaryField: string,
        //data: any,
        user: UserDTO,
        transaction?: Transaction, // Add an optional transaction parameter
    ) {
        const execute = async (t: Transaction) => {
            const data_with_id = {
                //...data,
                primaryKey: primaryKey,
                primaryField: primaryField,
            };
            const validated_data = await this.hooksService.triggerHooks(
                `beforeDelete:${baseModel}`,
                { data: data_with_id, user },
                t,
            );

            const model_instance = await this.qnatkService.deleteByPk(
                baseModel,
                primaryKey,
                primaryField,
                // data,
                t,
            );

            return await this.hooksService.triggerHooks(
                `afterDelete:${baseModel}`,
                {
                    ...validated_data,
                    modelInstance: model_instance,
                },
                t,
            );
        };

        let final_data;
        if (transaction) {
            // Use the existing transaction
            final_data = await execute(transaction);
        } else {
            // Create a new transaction
            final_data = await this.sequelize.transaction(execute);
        }

        return {
            ...final_data,
            modelInstance: final_data.modelInstance,
            message: `Action Delete executed successfully`,
        };
    }
}
