import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserGuard } from './guards/user.guard'; // Decodes standard token authentication payloads
import { AdminGuard } from './guards/admin.guard';
import axios from 'axios';
import { formatDuration } from './utils/duration-formatter.util';

@Controller()
export class RunController {
  constructor(private prisma: PrismaService) {}

  @Get('runs/:id/category')
  async getRunsByCategory(@Param('id') categoryId: string) {
    const runs = await this.prisma.run.findMany({
      where: { run_category_id: categoryId, status: 'ACCEPTED' },
      orderBy: { run_duration: 'asc' }
    });

    // Hydrate runtime objects across distinct backend network services via Axios
    const formattedRuns = await Promise.all(runs.map(async (run) => {
      let runnerInfo = null;
      try {
        const userRes = await axios.get(`http://localhost:3000/users/${run.user_id}/profile`);
        runnerInfo = userRes.data;
      } catch (e) {}

      return {
        run_id: run.run_id,
        vod_url: run.vod_url,
        status: run.status,
        duration_formatted: `${Math.floor(Number(run.run_duration) / 3600)} Hour(s) ${Math.floor((Number(run.run_duration) % 3600) / 60)} Minute(s) ${Number(run.run_duration) % 60} Second(s)`,
        runner: runnerInfo
      };
    }));

    return formattedRuns;
  }

  @Post('runs')
  @UseGuards(UserGuard)
  async submitRun(@Req() req: any, @Body() body: { category_id: string; vod_url: string; duration: number }) {
    if (!body.category_id || !body.vod_url || !body.duration) {
      throw new BadRequestException('Run category id, vod url, and duration duration must be filled.');
    }

    // Verify category exists via Game Service
    try {
      await axios.get(`http://localhost:3001/categories/${body.category_id}`);
    } catch (err) {
      throw new BadRequestException('Target Run category ID does not exist.');
    }

    await this.prisma.run.create({
      data: {
        run_category_id: body.category_id,
        user_id: req.user.id,
        vod_url: body.vod_url,
        run_duration: BigInt(body.duration),
        status: 'PENDING'
      }
    });

    return { message: 'Speedrun entry successfully submitted.' };
  }

  // --- Dynamic Social Comments Processing Modules ---

  @Post('comments')
  @UseGuards(UserGuard)
  async postComment(@Req() req: any, @Body() body: { run_id: string; user_id: string; comment: string }) {
    if (body.user_id !== req.user.id) throw new ForbiddenException('User signature mismatch.');

    const run = await this.prisma.run.findUnique({ where: { run_id: body.run_id } });
    if (!run) throw new BadRequestException('Run target element could not be found.');

    await this.prisma.comment.create({
      data: {
        run_id: body.run_id,
        user_id: body.user_id,
        comment: body.comment
      }
    });
    return { message: 'Comment created successfully.' };
  }

  @Delete('comments/:id')
  @UseGuards(UserGuard)
  async deleteComment(@Req() req: any, @Param('id') commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { comment_id: commentId } });
    if (!comment) throw new BadRequestException('Comment does not exist.');
    if (comment.user_id !== req.user.id) throw new ForbiddenException('You are not the comment owner.');

    await this.prisma.comment.delete({ where: { comment_id: commentId } });
    return { message: 'Comment deleted successfully.' };
  }

  // --- Management Administrative Enforcements ---

  @Post('admin/runs/:id/accept')
  @UseGuards(AdminGuard)
  async acceptRun(@Param('id') id: string) {
    await this.prisma.run.update({
      where: { run_id: id },
      data: { status: 'ACCEPTED', verified_at: new Date() }
    });
    return { message: 'Run entry status updated to ACCEPTED.' };
  }
}