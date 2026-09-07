"""
AutoBox App Flow CLI Client
通过API以CLI形式管理应用流程

特点：
- 仅运行一次，不自动重试
- 失败时直接返回错误信息，不重试
- 清晰的错误分类和描述
"""

import requests
import time
import sys
from typing import Optional, Dict, Any, List, Union


class AppFlowError(Exception):
    """AppFlow操作异常 - 包含错误详情"""
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict] = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}


class TaskError(Exception):
    """任务执行异常 - 包含任务状态和结果"""
    def __init__(self, message: str, task_id: str, status: str, result: Any = None, error: Any = None):
        super().__init__(message)
        self.task_id = task_id
        self.status = status
        self.result = result
        self.error = error


class AppFlowClient:
    """AutoBox应用流程CLI客户端"""
    
    def __init__(self, host: str = "localhost", port: int = 8066, timeout: int = 30):
        """
        初始化客户端
        
        Args:
            host: API服务器地址，默认 localhost
            port: API服务器端口，默认 8066
            timeout: 请求超时时间(秒)，默认 30
        """
        self.base_url = f"http://{host}:{port}"
        self.timeout = timeout
    
    def _request(self, method: str, path: str, **kwargs) -> Any:
        """发送HTTP请求（不重试，直接返回错误）"""
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(method, url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            raise AppFlowError(f"请求超时: {url}", error_code="REQUEST_TIMEOUT")
        except requests.exceptions.ConnectionError:
            raise AppFlowError(f"连接失败，请检查服务是否运行: {self.base_url}", error_code="CONNECTION_FAILED")
        except requests.exceptions.HTTPError as e:
            raise AppFlowError(f"HTTP错误: {e}", error_code="HTTP_ERROR")
        except requests.exceptions.RequestException as e:
            raise AppFlowError(f"请求异常: {e}", error_code="REQUEST_ERROR")
    
    def _check_response(self, response: Any) -> Dict[str, Any]:
        """检查API响应，不成功则抛出异常"""
        # 有些API直接返回list，是正常响应
        if isinstance(response, list):
            return {"success": True, "data": response}
        if isinstance(response, dict):
            if not response.get("success", False):
                error_msg = response.get("message", "未知错误")
                error = response.get("error")
                raise AppFlowError(
                    f"API调用失败: {error_msg}" + (f" ({error})" if error else ""),
                    error_code="API_ERROR",
                    details=response
                )
            return response
        return {"success": True, "data": response}
    
    def run(self, box_id: str, web_input: Optional[Dict[str, Any]] = None, 
            headless: bool = True, timeout: int = 300) -> Dict[str, Any]:
        """
        同步运行CLI任务（仅执行一次，不重试）
        提交任务并等待完成
        
        Args:
            box_id: 机器人ID
            web_input: 传递给流程的输入数据
            headless: 是否无头模式运行，默认 True
            timeout: 超时时间(秒)，默认 300
            
        Returns:
            任务结果，包含 status, result, elapsed_seconds 等
            
        Raises:
            AppFlowError: API调用失败（连接、超时等）
            TaskError: 任务执行失败（failed、timeout等）
        """
        payload = {
            "box_id": box_id,
            "headless": headless,
            "timeout": timeout
        }
        if web_input is not None:
            payload["web_input"] = web_input
        
        response = self._request("POST", "/cli/run", json=payload)
        
        if not response.get("success"):
            raise AppFlowError(
                f"任务运行失败: {response.get('message', '未知错误')}",
                error_code="RUN_FAILED",
                details=response
            )
        
        status = response.get("status", "")
        task_id = response.get("autobox_task_id", "")
        
        if status == "failed":
            error = response.get("error") or response.get("result", {}).get("error")
            raise TaskError(
                f"任务执行失败" + (f": {error}" if error else ""),
                task_id=task_id,
                status=status,
                result=response.get("result"),
                error=error
            )
        
        if status == "timeout":
            raise TaskError(
                f"任务执行超时（{timeout}秒）",
                task_id=task_id,
                status=status,
                result=None,
                error="Task execution timeout"
            )
        
        return response
    
    def submit(self, box_id: str, web_input: Optional[Dict[str, Any]] = None,
               headless: bool = True, timeout: int = 300) -> Dict[str, Any]:
        """
        异步提交CLI任务（仅执行一次，不重试）
        立即返回任务信息，通过 task_id 查询结果
        """
        payload = {
            "box_id": box_id,
            "headless": headless,
            "timeout": timeout
        }
        if web_input is not None:
            payload["web_input"] = web_input
        
        response = self._request("POST", "/cli/submit", json=payload)
        return self._check_response(response)
    
    def get_status(self, task_id: str) -> Dict[str, Any]:
        """获取任务状态"""
        response = self._request("GET", f"//cli/status/{task_id}")
        return self._check_response(response)
    
    def get_result(self, task_id: str) -> Dict[str, Any]:
        """获取任务结果"""
        response = self._request("GET", f"/cli/result/{task_id}")
        return self._check_response(response)
    
    def list_tasks(self, status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """列出任务"""
        params = {"limit": limit}
        if status:
            params["status"] = status
        
        result = self._request("GET", "/cli/list", params=params)
        if isinstance(result, dict) and "tasks" in result:
            return result["tasks"]
        return result if isinstance(result, list) else []
    
    def cancel(self, task_id: str) -> Dict[str, Any]:
        """取消任务"""
        response = self._request("POST", f"/cli/cancel/{task_id}")
        return self._check_response(response)
    
    def delete_task(self, task_id: str) -> Dict[str, Any]:
        """删除任务"""
        response = self._request("DELETE", f"/cli/task/{task_id}")
        return self._check_response(response)
    
    def get_logs(self, task_id: str) -> Dict[str, Any]:
        """获取任务日志"""
        response = self._request("GET", f"/cli/logs/{task_id}")
        return self._check_response(response)
    
    def wait_for_completion(self, task_id: str, poll_interval: float = 1.0, 
                            max_wait: Optional[float] = None) -> Dict[str, Any]:
        """等待任务完成（轮询）"""
        start_time = time.time()
        
        while True:
            status_result = self.get_status(task_id)
            status = status_result.get("status", "")
            
            if status in ("completed", "failed", "timeout", "cancelled"):
                return self.get_result(task_id)
            
            if max_wait and (time.time() - start_time) > max_wait:
                raise AppFlowError(
                    f"等待任务完成超时（已等待 {int(max_wait)} 秒）",
                    error_code="WAIT_TIMEOUT",
                    details={"task_id": task_id, "max_wait": max_wait}
                )
            
            time.sleep(poll_interval)
    
    def search_boxes(self, query: str) -> List[Dict[str, Any]]:
        """
        按关键词搜索 Box
        
        Args:
            query: 搜索关键词，匹配 keywords 和 instructions
            
        Returns:
            匹配的 Box 列表
        """
        result = self._request("GET", "/box/search", params={"q": query})
        # 兼容两种响应格式：直接返回list 或 dict包裹
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            if not result.get("success", True):
                raise AppFlowError(
                    f"搜索失败: {result.get('message', '未知错误')}",
                    error_code="API_ERROR",
                    details=result
                )
            return result.get("boxes", [])
        return []
    
    def list_boxes(self, box_id: Optional[str] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        列出 Box 列表（激活的Box流程）
        
        Args:
            box_id: 机器人ID，为空则返回全部 Box
            **kwargs: 扩展参数
            
        Returns:
            Box 列表，每个包含 id, name, types, version, box_path 等
        """
        payload = {"kwargs": kwargs}
        if box_id:
            payload["box_id"] = box_id
        
        result = self._request("POST", "/box/list", json=payload)
        # 兼容两种响应格式：直接返回list 或 dict包裹
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            if not result.get("success", True):
                raise AppFlowError(
                    f"获取Box列表失败: {result.get('message', '未知错误')}",
                    error_code="API_ERROR",
                    details=result
                )
            return result.get("boxes", [])
        return []
    
    def open_box(self, box_id: str) -> Dict[str, Any]:
        """
        打开本地 Box JSON 文件（绝对路径）。
        调用后端 POST /box/open，传入 box_id（绝对路径）。
        
        注意：与 run/submit 不同的是，box_id 在这里指的是磁盘上
        .json 流程文件的绝对路径，而不是已激活的 Box ID。
        
        Args:
            box_id: .json 文件的绝对路径
                （如 "D:/boxes/工具类/文件操作/B202607162100/skill_installer_flow.json"）
        
        Returns:
            后端响应字典，形如：
                {
                    "status": "执行成功",
                    "box_id": "D:/boxes/.../skill_installer_flow.json"
                }
            或失败时：
                {
                    "status": "执行失败",
                    "error": "...",
                    "status_code": 403    # HTTP 状态码（仅在 HTTP 非 200 时附带）
                }
                当响应体不是合法 JSON 时，error 字段会带上原始文本。
            
        Raises:
            AppFlowError: 连接失败/请求超时等网络层面的错误
                业务层面的"执行失败"（含 HTTP 4xx）不抛异常，
                而是通过返回字典的 status / status_code 字段表达，
                便于调用方与后端约定保持一致。
        """
        if not box_id:
            raise AppFlowError(
                "box_id 不能为空（请传入 .json 文件的绝对路径）",
                error_code="INVALID_ARGUMENT"
            )
        normalized = box_id.replace("\\", "/")
        payload = {"box_id": normalized}
        return self._call_status_endpoint("POST", "/box/open", payload)
    
    def import_box(self, box_id: str) -> Dict[str, Any]:
        """
        导入本地 Box JSON 文件（绝对路径）。
        调用后端 POST /box/import，传入 box_id（绝对路径）。
        后端会复制文件到目标目录，并返回 target_dir / json_path / box_path。
        
        注意：与 open_box 不同的是，import 会把 .json 真正落地到
        流程管理目录里；open 仅打开/解析，不落地。
        
        Args:
            box_id: 待导入的 .json 文件绝对路径
        
        Returns:
            成功时：
                {
                    "status": "执行成功",
                    "result": {
                        "target_dir": "...",
                        "json_path": "...",
                        "box_path": "..."
                    }
                }
            失败时：
                {
                    "status": "执行失败",
                    "error": "...",
                    "status_code": 403
                }
            
        Raises:
            AppFlowError: 连接失败/请求超时等网络层面的错误
                业务层面的"执行失败"（含 HTTP 4xx）不抛异常。
        """
        if not box_id:
            raise AppFlowError(
                "box_id 不能为空（请传入 .json 文件的绝对路径）",
                error_code="INVALID_ARGUMENT"
            )
        normalized = box_id.replace("\\", "/")
        payload = {"box_id": normalized}
        return self._call_status_endpoint("POST", "/box/import", payload)
    
    def _call_status_endpoint(self, method: str, path: str,
                              payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        调用使用 "status" 字段而非 "success" 字段的接口（/box/open、/box/import）。
        
        与 _request 不同的是，本方法在 HTTP 4xx/5xx 时不抛 HTTPError，
        而是尝试解析响应体并把它作为业务失败返回（保留 status / error 字段）。
        只有在连接失败/超时/响应体非 JSON 时才抛 AppFlowError。
        """
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(method, url, timeout=self.timeout,
                                        json=payload)
        except requests.exceptions.Timeout:
            raise AppFlowError(f"请求超时: {url}", error_code="REQUEST_TIMEOUT")
        except requests.exceptions.ConnectionError:
            raise AppFlowError(
                f"连接失败，请检查服务是否运行: {self.base_url}",
                error_code="CONNECTION_FAILED"
            )
        except requests.exceptions.RequestException as e:
            raise AppFlowError(f"请求异常: {e}", error_code="REQUEST_ERROR")
        
        # 尝试解析 JSON
        try:
            data = response.json()
        except ValueError:
            # 响应体不是合法 JSON，按 HTTP 错误处理
            raise AppFlowError(
                f"HTTP {response.status_code}: 非 JSON 响应: {response.text[:200]}",
                error_code="HTTP_ERROR",
                details={"status_code": response.status_code, "raw": response.text}
            )
        
        # 无论 HTTP 状态如何，统一以字典返回（业务错误也走字典）
        if not isinstance(data, dict):
            data = {"status": "执行失败", "error": f"非预期响应类型: {type(data).__name__}",
                    "status_code": response.status_code, "raw": data}
            return data
        
        # 在非 2xx 时附加 status_code，便于调用方判断
        if response.status_code >= 400 and "status_code" not in data:
            data = {**data, "status_code": response.status_code}
        return data


# 命令行入口
if __name__ == "__main__":
    import argparse
    import json
    
    # 解决 Windows 上 stdout 缓冲问题
    try:
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
    except AttributeError:
        pass
    
    parser = argparse.ArgumentParser(description="AutoBox App Flow CLI")
    parser.add_argument("--host", default="localhost", help="API服务器地址")
    parser.add_argument("--port", type=int, default=8066, help="API服务器端口")
    parser.add_argument("action", choices=[
        "run", "submit", "status", "result",
        "list", "list-boxes", "search",
        "cancel", "delete", "logs",
        "open", "import"
    ])
    parser.add_argument("box_id", nargs="?", help="机器人ID 或 .json 文件绝对路径（run/submit/open/import/list-boxes 时需要）")
    parser.add_argument("--web-input", help="web_input JSON字符串")
    parser.add_argument("--task-id", help="任务ID")
    parser.add_argument("--status", help="过滤状态")
    parser.add_argument("--timeout", type=int, default=300, help="超时时间(秒)")
    parser.add_argument("--headless", type=lambda x: x.lower() == "true", default=True)
    parser.add_argument("--poll-interval", type=float, default=1.0)
    parser.add_argument("--query", help="搜索关键词 (search时必填)")
    
    args = parser.parse_args()
    
    client = AppFlowClient(host=args.host, port=args.port)
    
    try:
        if args.action == "run":
            if not args.box_id:
                print("Error: box_id required for run", file=sys.stderr)
                sys.exit(1)
            web_input = json.loads(args.web_input) if args.web_input else None
            result = client.run(args.box_id, web_input, args.headless, args.timeout)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "submit":
            if not args.box_id:
                print("Error: box_id required for submit", file=sys.stderr)
                sys.exit(1)
            web_input = json.loads(args.web_input) if args.web_input else None
            result = client.submit(args.box_id, web_input, args.headless, args.timeout)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "status":
            if not args.task_id:
                print("Error: task_id required", file=sys.stderr)
                sys.exit(1)
            result = client.get_status(args.task_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "result":
            if not args.task_id:
                print("Error: task_id required", file=sys.stderr)
                sys.exit(1)
            result = client.get_result(args.task_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "list":
            # 列出任务历史
            result = client.list_tasks(args.status)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "list-boxes":
            # 列出激活的Box流程
            boxes = client.list_boxes(args.box_id)
            if args.box_id:
                # 查看单个Box详情
                print(json.dumps(boxes, indent=2, ensure_ascii=True))
            else:
                # 列出全部Box，格式化输出
                print(f"=== 共 {len(boxes)} 个激活的 Box 流程 ===\n")
                for i, box in enumerate(boxes, 1):
                    name = box.get("name", "N/A")
                    bid = box.get("id", "N/A")
                    types = box.get("types", "")
                    ver = box.get("version", "N/A")
                    creator = box.get("creator", "N/A")
                    instr = box.get("instructions", "").strip().split("\n")[0][:80]
                    print(f"{i:3d}. [{bid}] {name}")
                    print(f"     分类: {types} | 版本: {ver} | 作者: {creator}")
                    print(f"     说明: {instr}")
                    print()
                print(f"--- 共 {len(boxes)} 个 ---")
            
        elif args.action == "search":
            if not args.query:
                print("Error: --query required for search", file=sys.stderr)
                sys.exit(1)
            boxes = client.search_boxes(args.query)
            print(f"=== 搜索 \"{args.query}\" 找到 {len(boxes)} 个 Box ===\n")
            for i, box in enumerate(boxes, 1):
                name = box.get("name", "N/A")
                bid = box.get("id", "N/A")
                instructions = box.get("instructions", "").strip().split("\n")[0][:80]
                params = box.get("parameters", [])
                print(f"{i}. [{bid}] {name}")
                print(f"   说明: {instructions}")
                if params:
                    print(f"   参数:")
                    for p in params:
                        req = "必填" if p.get("required") else "选填"
                        print(f"     - {p.get('name','?')} ({p.get('type','?')}) {req}: {p.get('description','')}")
                print()
            
        elif args.action == "cancel":
            if not args.task_id:
                print("Error: task_id required", file=sys.stderr)
                sys.exit(1)
            result = client.cancel(args.task_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "delete":
            if not args.task_id:
                print("Error: task_id required", file=sys.stderr)
                sys.exit(1)
            result = client.delete_task(args.task_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
        elif args.action == "logs":
            if not args.task_id:
                print("Error: task_id required", file=sys.stderr)
                sys.exit(1)
            result = client.get_logs(args.task_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))

        elif args.action == "open":
            # 打开本地 .json 文件
            if not args.box_id:
                print("Error: box_id required for open (请传入 .json 文件的绝对路径)", file=sys.stderr)
                sys.exit(1)
            result = client.open_box(args.box_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))

        elif args.action == "import":
            # 导入本地 .json 文件到流程目录
            if not args.box_id:
                print("Error: box_id required for import (请传入 .json 文件的绝对路径)", file=sys.stderr)
                sys.exit(1)
            result = client.import_box(args.box_id)
            print(json.dumps(result, indent=2, ensure_ascii=True))
            
    except AppFlowError as e:
        print(f"[AppFlowError] {e}", file=sys.stderr)
        if e.error_code:
            print(f"Error Code: {e.error_code}", file=sys.stderr)
        if e.details:
            print(f"Details: {json.dumps(e.details, ensure_ascii=False)}", file=sys.stderr)
        sys.exit(1)
    except TaskError as e:
        print(f"[TaskError] {e}", file=sys.stderr)
        print(f"Task ID: {e.task_id}", file=sys.stderr)
        print(f"Status: {e.status}", file=sys.stderr)
        if e.error:
            print(f"Error: {e.error}", file=sys.stderr)
        sys.exit(1)
