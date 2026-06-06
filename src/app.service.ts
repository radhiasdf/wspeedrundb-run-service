import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import axios from 'axios';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // --- RUN LOGIC ---
  // =========================================================================

  async getRunsByCategory(categoryId: string) {
    try {
      await axios.get(`http://localhost:3001/categories/${categoryId}`);
    } catch (err) {
      throw new BadRequestException('Target Run category ID does not exist.');
    }

    const runs = await this.prisma.run.findMany({
      where: { run_category_id: categoryId, status: 'ACCEPTED' },
      orderBy: { run_duration: 'asc' }
    });

    return Promise.all(runs.map(async (run) => {
      let runnerInfo = null;
      try {
        const userRes = await axios.get(`http://localhost:3000/users/${run.user_id}/profile`);
        runnerInfo = userRes.data;
      } catch (e) {}

      const totalSeconds = Number(run.run_duration);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        run_id: run.run_id,
        vod_url: run.vod_url,
        status: run.status,
        submitted_at: run.submitted_at,
        duration_formatted: `${hours} Hour(s) ${minutes} Minute(s) ${seconds} Second(s)`,
        runner: runnerInfo
      };
    }));
  }

  async getRunsByUser(targetUserId: string, authenticatedUserId: string | null) {
    if (authenticatedUserId && authenticatedUserId === targetUserId) {
      return this.prisma.run.findMany({ where: { user_id: targetUserId } });
    } else {
      return this.prisma.run.findMany({ where: { user_id: targetUserId, status: 'ACCEPTED' } });
    }
  }

  async getRunDetails(runId: string) {
    const run = await this.prisma.run.findUnique({
      where: { run_id: runId },
      include: { comments: true }
    });
    if (!run) throw new BadRequestException('Target run record could not be found.');

    let categoryDetails = null;
    try {
      const categoryRes = await axios.get(`http://localhost:3001/categories/${run.run_category_id}`);
      categoryDetails = categoryRes.data;
    } catch (e) {}

    let runnerInfo = null;
    try {
      const userRes = await axios.get(`http://localhost:3000/users/${run.user_id}/profile`);
      runnerInfo = userRes.data;
    } catch (e) {}

    return { ...run, run_category: categoryDetails, runner: runnerInfo };
  }

  async submitRun(userId: string, body: { category_id: string; vod_url: string; duration: number }) {
    if (!body.category_id || !body.vod_url || !body.duration) {
      throw new BadRequestException('Run category id, vod url, and run duration must be filled.');
    }
    if (isNaN(Number(body.duration))) {
      throw new BadRequestException('Run duration must be a valid number.');
    }

    try {
      await axios.get(`http://localhost:3001/categories/${body.category_id}`);
    } catch (err) {
      throw new BadRequestException('Target Run category ID does not exist.');
    }

    await this.prisma.run.create({
      data: {
        run_category_id: body.category_id,
        user_id: userId,
        vod_url: body.vod_url,
        run_duration: BigInt(body.duration),
        status: 'PENDING'
      }
    });
    return { message: 'Speedrun entry successfully submitted.' };
  }

  // =========================================================================
  // --- COMMENT LOGIC ---
  // =========================================================================

  async postComment(authUserId: string, body: { run_id: string; user_id: string; comment: string }) {
    if (!body.run_id || !body.user_id || !body.comment) {
      throw new BadRequestException('Run ID, User ID, and comment content must be provided.');
    }
    if (body.user_id !== authUserId) {
      throw new ForbiddenException('User signature token mismatch.');
    }

    const run = await this.prisma.run.findUnique({ where: { run_id: body.run_id } });
    if (!run) throw new BadRequestException('Run target element could not be found.');

    await this.prisma.comment.create({
      data: { run_id: body.run_id, user_id: body.user_id, comment: body.comment }
    });
    return { message: 'Comment created successfully.' };
  }

  async deleteComment(authUserId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { comment_id: commentId } });
    if (!comment) throw new BadRequestException('Comment does not exist.');
    if (comment.user_id !== authUserId) throw new ForbiddenException('You are not the comment owner.');

    await this.prisma.comment.delete({ where: { comment_id: commentId } });
    return { message: 'Comment deleted successfully.' };
  }

  // =========================================================================
  // --- ADMIN LOGIC ---
  // =========================================================================

  async getRunsByStatus(status: string) {
    const upperStatus = status.toUpperCase();
    if (!['PENDING', 'ACCEPTED', 'REJECTED'].includes(upperStatus)) {
      throw new BadRequestException('Invalid query workflow status requested.');
    }
    return this.prisma.run.findMany({ where: { status: upperStatus } });
  }

  async updateRunStatus(id: string, status: 'ACCEPTED' | 'REJECTED') {
    const run = await this.prisma.run.findUnique({ where: { run_id: id } });
    if (!run) throw new BadRequestException('Run entry not found.');

    await this.prisma.run.update({
      where: { run_id: id },
      data: { status, verified_at: new Date() }
    });
    return { message: `Run entry status updated to ${status}.` };
  }
}