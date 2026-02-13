"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

interface QuizQuestion {
  id: string;
  taskId: string;
  question: string;
  options: string[];
  order: number;
}

interface QuizResult {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  passingScore: number;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/quiz`);
      const data = await response.json();
      if (data.success) {
        setQuestions(data.data || []);
      } else {
        setError(data.error || "获取题目失败");
      }
    } catch {
      setError("获取题目失败");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchQuestions();
  }, [taskId, fetchQuestions]);

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      setError("请回答所有题目");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`/api/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, answers: formattedAnswers }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "提交答案失败");
      }
    } catch {
      setError("提交答案失败");
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                result.passed ? "bg-green-100" : "bg-red-100"
              }`}>
                {result.passed ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {result.passed ? "测验通过！" : "测验未通过"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-primary">{result.score}分</div>
                  <div className="text-sm text-gray-500">得分</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold">{result.correctAnswers}/{result.totalQuestions}</div>
                  <div className="text-sm text-gray-500">正确题数</div>
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">
                及格分数：{result.passingScore}分
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/tasks/${taskId}/learn`)}
                >
                  返回学习
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setCurrentIndex(0);
                  }}
                >
                  重新测验
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">暂无测验题目</h2>
            <p className="text-gray-500 mb-4">该任务还没有添加测验题目</p>
            <Button onClick={() => router.push(`/tasks/${taskId}/learn`)}>
              返回学习
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>第 {currentIndex + 1} 题 / 共 {questions.length} 题</span>
            <span>已回答 {answeredCount}/{questions.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 题目卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <span className="text-primary mr-2">Q{currentIndex + 1}.</span>
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === index
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleAnswer(currentQuestion.id, index)}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={answers[currentQuestion.id] === index}
                    onChange={() => handleAnswer(currentQuestion.id, index)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="flex-1">
                    {String.fromCharCode(65 + index)}. {option}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 导航按钮 */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            上一题
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || answeredCount < questions.length}
            >
              {submitting ? "提交中..." : "提交答案"}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              下一题
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* 题号快速导航 */}
        <div className="mt-8">
          <div className="text-sm text-gray-500 mb-3 text-center">快速跳转</div>
          <div className="flex flex-wrap justify-center gap-2">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={answers[q.id] !== undefined ? "default" : "outline"}
                size="sm"
                className={`w-10 h-10 ${currentIndex === index ? "ring-2 ring-primary" : ""}`}
                onClick={() => setCurrentIndex(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
