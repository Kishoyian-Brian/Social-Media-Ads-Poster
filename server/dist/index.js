"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    // Allow development origins (echo back the request origin). In production,
    // replace this with a specific origin or a whitelist.
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT') ?? 4000;
    await app.listen(port);
    console.log(`Backend is listening at http://localhost:${port}`);
}
bootstrap();
