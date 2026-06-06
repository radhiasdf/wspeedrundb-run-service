import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AppService } from './app.service';
import { UserGuard } from './guards/user.guard';
import { AdminGuard } from './guards/admin.guard';
import * as jwt from 'jsonwebtoken';

@ApiTags('Run Service')
@Controller()
export class RunController {
  constructor(private readonly appService: AppService) {}

  @Get('runs/:id/category')
  @ApiOperation({ summary: 'List of all accepted runs by run category' })
  async getRunsByCategory(@Param('id') categoryId: string) {
    return this.appService.getRunsByCategory(categoryId);
  }

  @Get('runs/:id/user')
  @ApiOperation({ summary: 'List of all runs submitted by a specific user' })
  async getRunsByUser(@Param('id') targetUserId: string, @Req() req: any) {
    const authHeader = req.headers.authorization;
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'SUPER_SECRET_KEY_123') as { id: string };
        authenticatedUserId = decoded.id;
      } catch (err) {}
    }
    return this.appService.getRunsByUser(targetUserId, authenticatedUserId);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get detailed information for a specific entry' })
  async getRunDetails(@Param('id') runId: string) {
    return this.appService.getRunDetails(runId);
  }

  @Post('runs')
  @UseGuards(UserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new pending speedrun entry' })
  async submitRun(@Req() req: any, @Body() body: { category_id: string; vod_url: string; duration: number }) {
    return this.appService.submitRun(req.user.id, body);
  }

  @Post('comments')
  @UseGuards(UserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a comment on an active run' })
  async postComment(@Req() req: any, @Body() body: { run_id: string; user_id: string; comment: string }) {
    return this.appService.postComment(req.user.id, body);
  }

  @Delete('comments/:id')
  @UseGuards(UserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your own comment' })
  async deleteComment(@Req() req: any, @Param('id') commentId: string) {
    return this.appService.deleteComment(req.user.id, commentId);
  }

  @Get('admin/runs/:status')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all submissions filtered by status' })
  async getRunsByStatus(@Param('status') status: string) {
    return this.appService.getRunsByStatus(status);
  }

  @Post('admin/runs/:id/accept')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a submitted run entry' })
  async acceptRun(@Param('id') id: string) {
    return this.appService.updateRunStatus(id, 'ACCEPTED');
  }

  @Post('admin/runs/:id/reject')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a submitted run entry' })
  async rejectRun(@Param('id') id: string) {
    return this.appService.updateRunStatus(id, 'REJECTED');
  }
}