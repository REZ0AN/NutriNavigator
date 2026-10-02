import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from server import RecommendationResponse, app


class RecommendationServiceTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {"X-Recommendation-Secret": "test-secret"}

    @patch("server.SERVICE_SECRET", "test-secret")
    @patch("server._build_structured_model")
    def test_recommendation_returns_structured_model_result(self, build_model):
        build_model.return_value.invoke.return_value = RecommendationResponse(
            recommendations=[{"name": "Apple", "reason": "A simple fruit choice."}]
        )

        response = self.client.post(
            "/recommend",
            headers=self.headers,
            json={"age": 28, "height": 1.72, "weight": 68, "gender": 1, "diseases": [1, 7]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["recommendations"][0]["name"], "Apple")
        build_model.return_value.invoke.assert_called_once()

    @patch("server.SERVICE_SECRET", "test-secret")
    def test_missing_secret_is_rejected(self):
        response = self.client.post(
            "/recommend",
            json={"age": 28, "height": 1.72, "weight": 68, "gender": 1, "diseases": []},
        )
        self.assertEqual(response.status_code, 401)

    @patch("server.SERVICE_SECRET", "test-secret")
    def test_invalid_profile_is_rejected_before_provider_call(self):
        with patch("server._build_structured_model") as build_model:
            response = self.client.post(
                "/recommend",
                headers=self.headers,
                json={"age": 200, "height": 1.72, "weight": 68, "gender": 1, "diseases": []},
            )
        self.assertEqual(response.status_code, 422)
        build_model.assert_not_called()


if __name__ == "__main__":
    unittest.main()
